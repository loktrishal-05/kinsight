import json
import time
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from scripts.mock_lab import hl7_message
from services.api.main import create_app
from services.api.routes.lab_feed import HL7_PATH, MAX_BODY_SIZE, PATH, SIGNING_SECRET, signature
from services.cohort.fhir import SYSTEM, TAG
from services.consent.audit import verify_chain
from services.consent.models import AuditEvent
from tests.integration.test_lab_sandbox import INTAKE, PERSONAL, REVIEW, auth, init, report

KEY = b"synthetic-lab-feed-test-distinct-secret"

SANDBOX_ROUTES = {
    (INTAKE, "post"),
    (PERSONAL, "get"),
    (f"{PERSONAL}/share", "post"),
    ("/api/counsellor/sandbox-reports/{subject}", "get"),
    ("/api/counsellor/sandbox-reports/{subject}/approve", "post"),
}


def test_lab_route_inventory_requires_authentication(monkeypatch):
    init(monkeypatch, "0")
    monkeypatch.setenv(SIGNING_SECRET, KEY.decode())

    def routes(app):
        return {(path, method) for path, methods in app.openapi()["paths"].items() for method in methods}

    baseline = routes(create_app("sqlite://"))
    monkeypatch.setenv("KINSIGHT_LAB_SANDBOX", "1")
    app = create_app("sqlite://")
    expected = SANDBOX_ROUTES | {(PATH, "post"), (HL7_PATH, "post")}
    assert routes(app) - baseline == expected
    with TestClient(app) as client:
        for path, method in expected:
            response = client.request(method.upper(), path.replace("{subject}", "synthetic-a"))
            assert response.status_code == 401, path
            assert response.headers["cache-control"] == "no-store"


def envelope(event, *, timestamp=None, path=PATH):
    body = json.dumps(event).encode() if not isinstance(event, bytes) else event
    stamp = str(int(time.time()) if timestamp is None else timestamp)
    delivery = uuid4().hex
    return {
        "content": body,
        "headers": {
            "x-lab-timestamp": stamp,
            "x-lab-delivery": delivery,
            "x-lab-signature": signature(KEY, stamp, delivery, body, path=path),
        },
    }


def test_signed_lab_moves_tracker_and_keeps_release_gated(monkeypatch, tmp_path):
    init(monkeypatch, "1")
    monkeypatch.setenv(SIGNING_SECRET, KEY.decode())
    app = create_app(f"sqlite:///{tmp_path / 'lab.db'}")
    tracker = "/api/lifecycle/tracker"
    with TestClient(app) as client:
        a, b, reviewer, operator = (
            auth(client, role) for role in ("person_a", "person_b", "counsellor", "demo_operator")
        )
        assert client.get(tracker, headers=a).json()["stage"] == 1
        assert client.post(f"{tracker}/advance", headers=a).status_code == 403
        assert client.post(INTAKE, headers=operator, json=report()).status_code == 403
        stage = {"kind": "stage", "subject_id": "synthetic-a", "stage": 2}
        delivery = envelope(stage)
        assert client.post(PATH, content=delivery["content"], headers=a).status_code == 401
        assert client.post(PATH, **envelope(stage, timestamp=int(time.time()) - 301)).status_code == 401
        assert client.post(PATH, content=b"different", headers=delivery["headers"]).status_code == 401
        assert client.post(PATH, **envelope(b" " * (MAX_BODY_SIZE + 1))).status_code == 413
        assert client.post(PATH, **envelope({"kind": "other"})).status_code == 422
        assert client.post(PATH, **envelope({**stage, "stage": 4})).status_code == 409
        assert client.post(PATH, **envelope({"kind": "report", "report": report()})).status_code == 409
        assert client.post(PATH, **delivery).json()["stage"] == 2
        assert client.post(PATH, **delivery).status_code == 409
        for index in range(3, 8):
            assert client.post(PATH, **envelope({**stage, "stage": index})).json()["stage"] == index
        current = client.get(tracker, headers=a).json()
        assert current["source"] == "signed_lab"
        assert set(current["times"]) == set(current["stages"][1:7])
        assert client.get(tracker, headers=b).json()["stage"] == 1
        assert client.post(PATH, **envelope({"kind": "report", "report": report()})).json()["stage"] == 8
        assert client.get(PERSONAL, headers=a).json()["report"] is None
        assert client.get(REVIEW, headers=reviewer).status_code == 403
        assert client.post(f"{PERSONAL}/share", headers=a).status_code == 200
        assert client.post(f"{REVIEW}/approve", headers=reviewer, json={"revision": 1}).status_code == 204
        assert client.get(PERSONAL, headers=a).json()["state"] == "released"
        corrected = report(2, "corrected", "uncertain")
        assert client.post(PATH, **envelope({"kind": "report", "report": corrected})).json()["stage"] == 8
        assert client.get(PERSONAL, headers=a).json()["report"] is None
        assert client.post(f"{REVIEW}/approve", headers=reviewer, json={"revision": 1}).status_code == 409
    with app.state.sessions() as db:
        assert verify_chain(db)
        assert set(db.scalars(select(AuditEvent.reason_code).where(AuditEvent.decision == "deny"))) >= {
            "lab_event_rejected",
            "lab_replayed",
        }


def test_signed_hl7_orders_and_results_share_the_release_gate(monkeypatch, tmp_path, caplog):
    init(monkeypatch, "1")
    monkeypatch.setenv(SIGNING_SECRET, KEY.decode())
    app = create_app(f"sqlite:///{tmp_path / 'hl7-lab.db'}")
    with TestClient(app) as client:
        owner = auth(client, "person_a")
        reviewer = auth(client, "counsellor")
        order = hl7_message("synthetic-a", stage=2)
        assert client.post(HL7_PATH, content=order).status_code == 401
        assert client.post(HL7_PATH, **envelope(order)).status_code == 401
        assert caplog.messages.count("lab_auth_denied") == 2
        assert client.post(HL7_PATH, **envelope(order.replace(b"ORM^O01", b"ADT^A01"), path=HL7_PATH)).status_code == 422
        for stage in range(2, 8):
            assert client.post(HL7_PATH, **envelope(
                hl7_message("synthetic-a", stage=stage), path=HL7_PATH,
            )).json()["stage"] == stage
        delivery = envelope(hl7_message("synthetic-a"), path=HL7_PATH)
        assert client.post(HL7_PATH, **delivery).json()["stage"] == 8
        assert client.post(HL7_PATH, **delivery).status_code == 409
        assert client.get(PERSONAL, headers=owner).json()["report"] is None
        assert client.post(f"{PERSONAL}/share", headers=owner).status_code == 200
        assert client.post(f"{REVIEW}/approve", headers=reviewer, json={"revision": 1}).status_code == 204
        assert client.get(PERSONAL, headers=owner).json()["state"] == "released"
        corrected = hl7_message("synthetic-a", revision=2)
        assert client.post(HL7_PATH, **envelope(corrected, path=HL7_PATH)).json()["stage"] == 8
        assert client.get(PERSONAL, headers=owner).json()["report"] is None
        report_resource = report(3, "corrected", "uncertain")["resource"]
        report_resource["result"] = [{"reference": "Observation/fixture-one"}]
        observation = {
            "resourceType": "Observation", "id": "fixture-one", "status": "corrected",
            "subject": {"reference": "Patient/synthetic-b"}, "meta": {"tag": [TAG]},
            "code": {"coding": [{"system": f"{SYSTEM}/condition", "code": "COND_001"}]},
            "valueCodeableConcept": {"coding": [{"system": "http://loinc.org", "code": "LA11884-6"}]},
        }
        bundle = {
            "kind": "bundle", "subject_id": "synthetic-a", "revision": 3,
            "bundle": {"resourceType": "Bundle", "type": "collection", "entry": [
                {"resource": report_resource}, {"resource": observation},
            ]},
        }
        assert client.post(PATH, **envelope(bundle)).status_code == 422
        observation["subject"]["reference"] = "Patient/synthetic-a"
        assert client.post(PATH, **envelope(bundle)).json()["stage"] == 8
        assert client.get(PERSONAL, headers=owner).json()["revision"] == 3
        assert client.get(PERSONAL, headers=owner).json()["report"] is None
    with app.state.sessions() as db:
        assert verify_chain(db)
        assert set(db.scalars(select(AuditEvent.reason_code).where(AuditEvent.decision == "deny"))) >= {
            "lab_event_rejected", "lab_replayed",
        }
