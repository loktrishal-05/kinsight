"""Unified counsellor review queue (issue 40): each producer creates exactly one item, decisions are audited,
and no person endpoint returns a held item's content."""
import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from services.api.demo_path import CASE, COUPLE, _grant, _h
from services.api.main import create_app
from services.consent.models import AuditEvent
from services.lifecycle.store import ReviewItem
from tests.integration.test_lab_sandbox import init, report

INTAKE = "/api/sandbox/lab/reports"


@pytest.fixture
def client(monkeypatch):
    init(monkeypatch, "1")
    with TestClient(create_app("sqlite://")) as c:
        c.post("/api/demo/reset", headers=_h(c, "demo_operator"))
        yield c


def items(client, kind=None):
    with client.app.state.sessions() as db:
        q = select(ReviewItem)
        return db.scalars(q.where(ReviewItem.kind == kind) if kind else q).all()


def pool(client):
    ha, hb = _h(client, "person_a"), _h(client, "person_b")
    for h in (ha, hb):
        client.get("/api/me/results", headers=h)  # each person sees their own result first
    _grant(client, ha, "synthetic-b", "couple", COUPLE, "couple_pooling", ["tier"], "couple_planning")
    _grant(client, hb, "synthetic-a", "couple", COUPLE, "couple_pooling", ["tier"], "couple_planning")
    return ha, hb


def test_couple_result_creates_one_item_and_the_counsellor_decision_resolves_it(client):
    ha, hb = pool(client)
    _grant(client, hb, "synthetic-a", "couple", COUPLE, "couple_pooling", ["tier"], "couple_planning")  # repeat
    [item] = items(client, "couple_result")
    assert item.state == "pending" and item.ref == CASE
    mine = client.get("/api/lifecycle/review-items", headers=ha).json()["items"]
    assert [i["kind"] for i in mine] == ["couple_result"] and mine[0]["expected_hours"] == 72
    for scope, fields in (("couple_summary", ["brief", "referral"]), ("quiz_status", ["status"])):
        _grant(client, ha, "synthetic-counsellor", "case", CASE, scope, fields, "counselling")
    hc = _h(client, "counsellor")
    client.post(f"/api/counsellor/cases/{CASE}/decision", headers=hc, json={"decision": "hold", "reason_code": "more_time"})
    assert items(client, "couple_result")[0].state == "held"
    client.post(f"/api/counsellor/cases/{CASE}/decision", headers=hc, json={"decision": "approve", "reason_code": "reviewed"})
    assert items(client, "couple_result")[0].state == "approved"


def test_counselling_request_creates_exactly_one_item(client):
    ha = _h(client, "person_a")
    for _ in range(2):
        _grant(client, ha, "synthetic-counsellor", "case", CASE, "quiz_status", ["status"], "counselling")
    assert len(items(client, "counselling_request")) == 1


def test_reclassification_creates_one_item_per_variant(client):
    hc = _h(client, "counsellor")
    body = {"archived": {"1001": 3, "1002": 5, "1003": 4}, "feed": {"1001": 4, "1002": 3, "1003": 4}}
    for _ in range(2):
        assert client.post("/api/lifecycle/reclassify", headers=hc, json=body).status_code == 200
    assert sorted(i.ref for i in items(client, "reclassification")) == ["variant:1001", "variant:1002"]


def test_lab_report_share_creates_one_item_and_approval_resolves_it(client):
    hd, ha = _h(client, "demo_operator"), _h(client, "person_a")
    assert client.post(INTAKE, json=report(), headers=hd).status_code in (200, 201)
    for _ in range(2):
        client.post("/api/me/sandbox-report/share", headers=ha)
    [item] = items(client, "lab_report")
    hc = _h(client, "counsellor")
    revision = client.get("/api/counsellor/sandbox-reports/synthetic-a", headers=hc).json()["report"]["revision"]
    assert client.post("/api/counsellor/sandbox-reports/synthetic-a/approve", headers=hc,
                       json={"revision": revision}).status_code == 204
    assert items(client, "lab_report")[0].state == "approved"


def test_queue_decisions_are_role_gated_audited_and_never_leak_content(client):
    ha = _h(client, "person_a")
    _grant(client, ha, "synthetic-counsellor", "case", CASE, "quiz_status", ["status"], "counselling")
    hc = _h(client, "counsellor")
    queue = client.get("/api/lifecycle/review-queue", headers=hc).json()["items"]
    item = next(i for i in queue if i["kind"] == "counselling_request")
    assert client.get("/api/lifecycle/review-queue", headers=_h(client, "analyst")).status_code == 403
    assert client.post(f"/api/lifecycle/review-queue/{item['id']}/decision", headers=ha,
                       json={"decision": "approve", "reason_code": "x"}).status_code == 403
    with client.app.state.sessions() as db:
        before = db.scalar(select(func.count(AuditEvent.id)))
    r = client.post(f"/api/lifecycle/review-queue/{item['id']}/decision", headers=hc,
                    json={"decision": "hold", "reason_code": "waiting_for_family_history", "note": "private note"})
    assert r.json()["status"] == "held"
    with client.app.state.sessions() as db:
        assert db.scalar(select(func.count(AuditEvent.id))) > before
    mine = client.get("/api/lifecycle/review-items", headers=ha).json()["items"]
    assert mine == [{"kind": "counselling_request", "state": "held", "due_at": mine[0]["due_at"], "expected_hours": 168}]
    assert mine[0]["due_at"] > time.time()


def test_items_with_their_own_review_cannot_be_approved_from_the_queue(client):
    pool(client)
    hc = _h(client, "counsellor")
    item = next(i for i in client.get("/api/lifecycle/review-queue", headers=hc).json()["items"] if i["kind"] == "couple_result")
    assert item["dedicated"] is True
    r = client.post(f"/api/lifecycle/review-queue/{item['id']}/decision", headers=hc, json={"decision": "approve", "reason_code": "x"})
    assert r.status_code == 409
    # The person still cannot read the couple figure: release only happens in the case's own review.
    assert client.get(f"/api/couples/{COUPLE}/assessment", headers=_h(client, "partner_a")).status_code == 403
