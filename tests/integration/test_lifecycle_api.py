import pytest
from fastapi.testclient import TestClient

from services.api.main import create_app
from services.consent.audit import verify_chain
from services.consent.roles import PERSONAS


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    app = create_app("sqlite://")
    with TestClient(app) as client:
        heads = {}
        for persona in PERSONAS:
            token = client.post("/api/auth/persona", json={"persona": persona}).json()["access_token"]
            heads[persona] = {"Authorization": "Bearer " + token}
        yield client, heads, app


def test_pairing_flow_and_revoke_are_audited(api):
    c, h, app = api
    start = c.post("/api/lifecycle/pairing", headers=h["person_a"])
    assert start.status_code == 201
    pid, pin = start.json()["id"], start.json()["pin"]
    assert c.post(f"/api/lifecycle/pairing/{pid}/confirm", json={"pin": pin}, headers=h["person_a"]).status_code == 403
    assert c.post(f"/api/lifecycle/pairing/{pid}/confirm", json={"pin": "000000000"}, headers=h["person_b"]).status_code == 403
    assert c.post(f"/api/lifecycle/pairing/{pid}/confirm", json={"pin": pin}, headers=h["person_b"]).json()["status"] == "active"
    assert c.get(f"/api/lifecycle/pairing/{pid}", headers=h["person_a"]).json()["status"] == "active"
    assert c.get(f"/api/lifecycle/pairing/{pid}", headers=h["relative"]).status_code == 403
    assert c.post(f"/api/lifecycle/pairing/{pid}/revoke", headers=h["person_b"]).json()["status"] == "revoked"
    assert c.get(f"/api/lifecycle/pairing/{pid}", headers=h["person_a"]).json()["status"] == "revoked"
    with app.state.sessions() as db:
        assert verify_chain(db)


def test_pairing_limit_and_role_gates(api):
    c, h, _ = api
    codes = [c.post("/api/lifecycle/pairing", headers=h["person_a"]).status_code for _ in range(4)]
    assert codes == [201, 201, 201, 403]
    assert c.post("/api/lifecycle/pairing", headers=h["analyst"]).status_code == 403
    assert c.get("/api/lifecycle/tracker").status_code == 401
    assert c.get("/api/lifecycle/receipt", headers=h["counsellor"]).status_code == 403


def test_tracker_certificate_and_receipt(api):
    c, h, _ = api
    t = c.get("/api/lifecycle/tracker", headers=h["person_a"]).json()
    assert len(t["stages"]) == 8
    assert c.post("/api/lifecycle/tracker/advance", headers=h["person_a"]).json()["stage"] == t["stage"] + 1
    cert = c.get("/api/lifecycle/certificate?elapsed_days=95", headers=h["person_a"]).json()
    assert cert["expired"] and cert["genetic_compatibility"] == "permanent"
    r = c.get("/api/lifecycle/receipt", headers=h["person_b"]).json()
    assert r["balanced"] and r["your_share"] == "265.00" and r["total"] == "3100.00"
    assert c.get("/api/lifecycle/receipt", headers=h["person_a"]).json()["your_share"] == "0.00"
    assert {"partner", "card", "other_share"}.isdisjoint(str(r).lower().replace("_", " ").split())


def test_cascade_single_use_and_no_sender(api):
    c, h, _ = api
    tok = c.post("/api/lifecycle/cascade", json={"condition_id": "cah"}, headers=h["person_a"]).json()["token"]
    assert c.post("/api/lifecycle/cascade/redeem", json={"token": tok}, headers=h["analyst"]).status_code == 403
    ok = c.post("/api/lifecycle/cascade/redeem", json={"token": tok}, headers=h["relative"])
    assert ok.status_code == 200 and set(ok.json()) == {"condition_id", "is_synthetic"}
    assert c.post("/api/lifecycle/cascade/redeem", json={"token": tok}, headers=h["relative"]).status_code == 403
    assert c.post("/api/lifecycle/cascade/redeem", json={"token": "junk"}, headers=h["relative"]).status_code == 403
    assert c.post("/api/lifecycle/cascade", json={"condition_id": "Bad Id!"}, headers=h["person_a"]).status_code == 422
