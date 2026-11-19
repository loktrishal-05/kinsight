from copy import deepcopy

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import select

from scripts.export_fhir_bundles import build_bundles
from services.api import fhir_preview
from services.api.main import create_app
from services.consent.audit import verify_chain
from services.consent.models import AuditEvent
from services.lifecycle.store import FhirImport, ReviewItem
from tests.integration.test_lab_sandbox import auth, init

PATH = "/api/me/imports/fhir/preview"
IMPORT = "/api/me/imports/fhir"
REVIEW = "/api/counsellor/fhir-imports/synthetic-a"


def test_preview_uses_the_signed_in_assignment_and_rejects_mismatched_resources(monkeypatch, tmp_path):
    init(monkeypatch, "0")
    assert PATH not in create_app("sqlite://").openapi()["paths"]
    monkeypatch.setenv(fhir_preview.BASE_ENV, "http://fhir.test/fhir")
    bundle = build_bundles()[0][0][1]
    resources = {entry["request"]["url"]: entry["resource"] for entry in bundle["entry"]}
    first, second = (fhir_preview.ASSIGNED[actor] for actor in ("synthetic-a", "synthetic-b"))
    assert {key for key in resources if key.startswith("Patient/")} == {f"Patient/{first}", f"Patient/{second}"}
    requested = []
    problem = None

    def reply(request):
        path = request.url.path.removeprefix("/fhir/")
        if path.startswith("Patient/"):
            requested.append(path)
            return httpx.Response(200, json=resources[path])
        patient_id = request.url.params["_id"]
        assert request.url.params["subject"] == f"Patient/{patient_id}"
        assert request.url.params["_include"] == "DiagnosticReport:result"
        report = deepcopy(resources[f"DiagnosticReport/{patient_id}"])
        report["meta"]["versionId"] = "opaque.server-id"
        findings = [deepcopy(resources[item["reference"]]) for item in report["result"]]
        if problem == "subject":
            findings[-1]["subject"]["reference"] = f"Patient/{second}"
        if problem == "target":
            findings[0]["component"][0]["valueCodeableConcept"]["coding"][0]["code"] = "UNMAPPED_GENE"
        if problem == "foreign-reference":
            report["result"][0]["reference"] = "https://other.invalid/Observation/fixture"
        if problem == "invalid-resource":
            del findings[0]["status"]
        return httpx.Response(200, json={
            "resourceType": "Bundle", "type": "searchset",
            "entry": [{"resource": resource} for resource in [report, *findings]],
        })

    original_reader = fhir_preview.read_preview

    def read_with_fixture(_, patient_id, panel, **kwargs):
        with httpx.Client(base_url="http://fhir.test/fhir/", transport=httpx.MockTransport(reply)) as session:
            return original_reader(session, patient_id, panel, **kwargs)

    monkeypatch.setattr(fhir_preview, "read_preview", read_with_fixture)
    app = create_app(f"sqlite:///{tmp_path / 'fhir.db'}")
    with TestClient(app) as client:
        a, b, reviewer = (auth(client, role) for role in ("person_a", "person_b", "counsellor"))
        assert client.post(PATH).status_code == 401
        assert client.post(PATH, headers=reviewer).status_code == 403
        assert not requested
        a_preview = client.post(IMPORT, headers=a, json={"patient_id": second}).json()
        assert a_preview["report_id"] == first
        assert a_preview["version"] == "opaque.server-id"
        b_preview = client.post(PATH, headers=b).json()
        assert b_preview["report_id"] == second
        assert requested == [f"Patient/{first}", f"Patient/{second}"]
        problem = "subject"
        assert client.post(PATH, headers=a).status_code == 502
        problem = "foreign-reference"
        assert client.post(PATH, headers=a).status_code == 502
        problem = "invalid-resource"
        assert client.post(PATH, headers=a).status_code == 502
        problem = "target"
        gated = client.post(PATH, headers=a).json()
        assert gated["state"] == "requires_review"
        assert gated["unmapped"]
        assert gated["findings"] == []
        report = resources[f"DiagnosticReport/{first}"]
        assert gated["unmapped_source_ids"] == [report["result"][0]["reference"].split("/")[1]]
    with app.state.sessions() as session:
        assert len(session.scalars(select(AuditEvent).where(AuditEvent.resource_type == fhir_preview.RESOURCE)).all()) == 6
        assert verify_chain(session)


def test_confirm_review_correction_revoke_and_restart(monkeypatch, tmp_path):
    init(monkeypatch, "0")
    monkeypatch.setenv(fhir_preview.BASE_ENV, "http://fhir.test/fhir")
    url = f"sqlite:///{tmp_path / 'review.db'}"
    app = create_app(url)
    source = {
        "report_id": fhir_preview.ASSIGNED["synthetic-a"],
        "version": "initial",
        "issued_at": "2026-01-01T10:00:00+00:00",
        "status": "final",
        "state": "requires_review",
        "findings": [{"condition_id": "COND_001", "status": "uncertain", "source_id": "obs-a"}],
    }

    offline = False

    def read(*args, **kwargs):
        if offline:
            raise httpx.ConnectError("sandbox unavailable")
        return deepcopy(source)

    monkeypatch.setattr(fhir_preview, "read_preview", read)
    with TestClient(app) as client:
        a, b, reviewer = (auth(client, role) for role in ("person_a", "person_b", "counsellor"))
        assert client.get(REVIEW, headers=reviewer).status_code == 403
        preview = client.post(PATH, headers=a).json()
        assert preview["findings"] == []
        first = {"snapshot_id": preview["snapshot_id"]}
        assert client.post(f"{IMPORT}/confirm", headers=b, json=first).status_code == 409
        assert client.post(f"{IMPORT}/confirm", headers=a, json=first).status_code == 204
        assert client.post(f"{IMPORT}/confirm", headers=a, json=first).status_code == 204
        by_id = f"/api/me/imports/{first['snapshot_id']}"
        assert client.get(by_id, headers=a).json()["state"] == "pending"
        assert client.get(by_id, headers=b).status_code == 404
        with client.app.state.sessions() as db:  # one review-queue item however often the person confirms
            assert [r.state for r in db.scalars(select(ReviewItem).where(ReviewItem.kind == "fhir_import"))] == ["pending"]
        grants = client.get("/api/me/consents", headers=a).json()
        assert sum(grant["scope"] == "fhir_import_review" for grant in grants) == 1
        assert client.get(IMPORT, headers=a).json()["report"] is None
        assert client.get(IMPORT, headers=b).json()["state"] == "missing"
        assert client.get(REVIEW, headers=reviewer).json()["report"]["findings"][0]["status"] == "uncertain"
        assert client.post(f"{REVIEW}/approve", headers=reviewer, json=first).status_code == 204
        with client.app.state.sessions() as db:
            assert [r.state for r in db.scalars(select(ReviewItem).where(ReviewItem.kind == "fhir_import"))] == ["approved"]
        assert client.get(IMPORT, headers=a).json()["state"] == "released"

    app = create_app(url)
    with TestClient(app) as client:
        a, reviewer = (auth(client, role) for role in ("person_a", "counsellor"))
        assert client.get(IMPORT, headers=a).json()["state"] == "released"
        offline = True
        assert client.get(IMPORT, headers=a).status_code == 502
        offline = False
        # Linked observations can change independently of DiagnosticReport.meta.versionId.
        source["findings"][0]["status"] = "not_detected"
        assert client.get(IMPORT, headers=a).json() == {"state": "stale", "report": None, "is_synthetic": True}
        assert client.get(REVIEW, headers=reviewer).json()["report"] is None
        assert client.post(f"{REVIEW}/approve", headers=reviewer, json=first).status_code == 409
        assert client.post(f"{IMPORT}/confirm", headers=a, json=first).status_code == 409
        second = {"snapshot_id": client.post(PATH, headers=a).json()["snapshot_id"]}
        assert second != first
        assert client.post(f"{IMPORT}/confirm", headers=a, json=second).status_code == 204
        assert client.get(IMPORT, headers=a).json()["state"] == "pending"
        with app.state.sessions() as db:
            consent_id = db.get(FhirImport, "synthetic-a").consent_id
        assert client.post(f"/api/me/consents/{consent_id}/revoke", headers=a).status_code == 200
        assert client.get(REVIEW, headers=reviewer).status_code == 403
        assert client.get(IMPORT, headers=a).json()["state"] == "sharing_ended"
        assert client.post(f"{IMPORT}/confirm", headers=a, json=second).status_code == 204
        assert client.post(f"{REVIEW}/approve", headers=reviewer, json=second).status_code == 204
        corrected = client.get(IMPORT, headers=a).json()
        assert corrected["state"] == "released"
        assert corrected["report"]["findings"][0]["status"] == "not_detected"
        source["version"] = "unmapped"
        source["findings"] = []
        third = {"snapshot_id": client.post(PATH, headers=a).json()["snapshot_id"]}
        assert client.post(f"{IMPORT}/confirm", headers=a, json=third).status_code == 204
        assert not client.get(REVIEW, headers=reviewer).json()["can_approve"]
        assert client.post(f"{REVIEW}/approve", headers=reviewer, json=third).status_code == 409
    with app.state.sessions() as db:
        assert verify_chain(db)
