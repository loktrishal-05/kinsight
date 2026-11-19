import os
import time

import httpx
import pytest
from fastapi.testclient import TestClient

from services.agents.quiz import build_quiz
from services.api.main import create_app
from services.api.referral_delivery import BASE_ENV
from services.integrations import fhir_referral
from tests.integration.test_lab_sandbox import auth, init

PATH = "/api/counsellor/cases/demo-case/referral/fhir"


@pytest.fixture
def referral_app(monkeypatch, tmp_path):
    init(monkeypatch, "0")
    monkeypatch.setenv(BASE_ENV, os.environ.get("KINSIGHT_FHIR_TEST_URL", "http://fhir.test/fhir"))
    return create_app(f"sqlite:///{tmp_path / 'referral.db'}")


def prepare(client, app):
    owner, reviewer = (auth(client, persona) for persona in ("person_a", "counsellor"))
    assert client.get("/api/me/results", headers=owner).status_code == 200
    consent = {
        "grantee_id": "synthetic-counsellor", "resource_type": "case", "resource_id": "demo-case",
        "scope": "referral_delivery", "fields": ["referral_delivery"], "purpose": "counselling",
        "expires_at": time.time() + 1000, "text_shown": "Synthetic referral delivery consent",
    }
    case_grant = {**consent, "scope": "couple_summary", "fields": ["brief", "referral"]}
    assert client.post("/api/me/consents", headers=owner, json=case_grant).is_success
    approval = client.post("/api/counsellor/cases/demo-case/decision", headers=reviewer,
                           json={"decision": "approve", "reason_code": "reviewed"})
    assert approval.is_success and approval.json()["status"] == "released"
    quiz = build_quiz(app.state.backend.assessment, "en")
    answers = ["abc".index(quiz.key[question.id]) for question in quiz.questions]
    teach_back = client.post("/api/cases/demo-case/quiz/answers", headers=owner, json={"answers": answers})
    assert teach_back.is_success and teach_back.json()["status"] == "passed"
    stage = client.post("/api/counsellor/cases/demo-case/referral/events", headers=reviewer,
                        json={"event": "counselling_requested", "evidence_code": "none"})
    assert stage.is_success
    return owner, reviewer, consent


def test_only_an_assigned_counsellor_with_specific_consent_sends(referral_app, monkeypatch):
    sent = []

    def submit(_, **payload):
        sent.append(payload)
        return {"status": "requested", "task_id": "demo-task", "request_id": "demo-request"}

    monkeypatch.setattr(fhir_referral, "submit", submit)
    with TestClient(referral_app) as client:
        owner, reviewer, consent = prepare(client, referral_app)
        assert client.post(f"{PATH}/send", headers=owner).status_code == 403
        assert client.post(f"{PATH}/send", headers=reviewer).status_code == 403
        assert not sent
        grant = client.post("/api/me/consents", headers=owner, json=consent)
        assert grant.is_success, grant.text
        assert client.post(f"{PATH}/send", headers=reviewer).status_code == 200
        assert len(sent) == 1
        assert client.post(f"/api/me/consents/{grant.json()['id']}/revoke", headers=owner).is_success
        assert client.post(f"{PATH}/send", headers=reviewer).status_code == 403
        assert client.post(f"{PATH}/sync", headers=reviewer).status_code == 403
        assert len(sent) == 1


@pytest.mark.skipif(not os.environ.get("KINSIGHT_FHIR_TEST_URL"), reason="Requires disposable HAPI")
def test_hapi_completed_task_advances_referral_with_evidence(referral_app):
    with (
        TestClient(referral_app) as client,
        httpx.Client(base_url=os.environ["KINSIGHT_FHIR_TEST_URL"].rstrip("/") + "/",
                     headers={"Content-Type": "application/fhir+json"}) as hapi,
    ):
        owner, reviewer, consent = prepare(client, referral_app)
        assert client.post("/api/me/consents", headers=owner, json=consent).is_success
        response = client.post(f"{PATH}/send", headers=reviewer)
        assert response.status_code == 200, response.text
        sent = response.json()
        assert sent["synced_at"] > 0
        repeated = client.post(f"{PATH}/send", headers=reviewer).json()
        assert repeated["task_id"] == sent["task_id"]
        assert repeated["request_id"] == sent["request_id"]
        request = hapi.get(f"ServiceRequest/{sent['request_id']}").raise_for_status().json()
        assert request["code"]["coding"][0]["code"] == "genetic-counselling"
        assert set(request) == {
            "resourceType", "id", "meta", "identifier", "intent", "status", "subject",
            "code", "reasonCode", "occurrenceDateTime",
        }
        assert set(request["subject"]) == {"identifier"}
        assert request["subject"]["identifier"]["value"] != "synthetic-a"
        task_path = f"Task/{sent['task_id']}"
        task = hapi.get(task_path).raise_for_status().json()
        assert referral_app.state.backend.fhir_referral_state().state == "counselling_requested"
        task["status"] = "completed"
        hapi.put(task_path, json=task).raise_for_status()
        assert client.post(f"{PATH}/sync", headers=reviewer).json()["state"] == "completed"
        timeline = referral_app.state.backend.fhir_referral_state()
        assert timeline.state == "counselling_done"
        assert timeline.events[-1].evidence == task_path
        assert client.post(f"{PATH}/sync", headers=reviewer).json()["task_id"] == sent["task_id"]
        assert len(referral_app.state.backend.fhir_referral_state().events) == len(timeline.events)
