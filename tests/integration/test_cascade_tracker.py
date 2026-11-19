"""Cascade tracker: relatives listed with estimates, invites update the tracker, relatives learn only the condition."""
import pytest
from fastapi.testclient import TestClient

from services.api.demo_path import _h
from services.api.main import create_app

TRACKER = "/api/lifecycle/cascade-tracker"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    monkeypatch.setenv("KINSIGHT_DEMO", "1")
    with TestClient(create_app("sqlite://")) as c:
        c.post("/api/demo/reset", headers=_h(c, "demo_operator"))
        yield c


def first(view):
    cond = next(c for c in view["conditions"] if c["relatives"])
    return cond["condition_id"], cond["relatives"]


def test_relatives_are_listed_with_labelled_estimates_and_without_the_partner(client):
    ha = _h(client, "person_a")
    view = client.get(TRACKER, headers=ha).json()
    cond, rels = first(view)
    assert rels and all(r["chance"]["kind"] == "educational_estimate" for r in rels)
    assert "synthetic-b" not in {r["id"] for r in rels}
    assert rels[0]["degree"] == 1 and view["counts"]["not_contacted"] >= len(rels)
    assert client.get(TRACKER, headers=_h(client, "relative")).status_code == 403


def test_invite_opened_and_tested_update_the_tracker_and_reveal_nothing_to_the_relative(client):
    ha, hr = _h(client, "person_a"), _h(client, "relative")
    cond, rels = first(client.get(TRACKER, headers=ha).json())
    one, two = rels[0]["id"], rels[1]["id"]
    sent = client.post(f"{TRACKER}/contact", headers=ha, json={"relative_id": one, "condition_id": cond, "method": "invite"})
    assert sent.json()["status"] == "invited" and sent.json()["token"]
    client.post(f"{TRACKER}/contact", headers=ha, json={"relative_id": two, "condition_id": cond, "method": "in_person"})
    got = client.post("/api/lifecycle/cascade/redeem", headers=hr, json={"token": sent.json()["token"]}).json()
    assert set(got) == {"condition_id", "follow_up", "is_synthetic"} and got["condition_id"] == cond.lower()
    assert "synthetic-a" not in str(got) and "carrier" not in str(got)
    status = {r["id"]: r["status"] for r in first(client.get(TRACKER, headers=ha).json())[1]}
    assert status[one] == "opened" and status[two] == "told"
    assert client.post("/api/lifecycle/cascade/outcome", headers=hr, json={"code": got["follow_up"], "outcome": "tested"}).json() == {"status": "recorded", "is_synthetic": True}
    assert {r["id"]: r["status"] for r in first(client.get(TRACKER, headers=ha).json())[1]}[one] == "tested"


def test_forged_codes_and_unlisted_relatives_are_refused(client):
    ha, hr = _h(client, "person_a"), _h(client, "relative")
    cond, _ = first(client.get(TRACKER, headers=ha).json())
    assert client.post(f"{TRACKER}/contact", headers=ha, json={"relative_id": "synthetic-b", "condition_id": cond, "method": "invite"}).status_code == 404
    fake = "ab" * 8 + "." + "0" * 64
    assert client.post("/api/lifecycle/cascade/outcome", headers=hr, json={"code": fake, "outcome": "tested"}).status_code == 403
