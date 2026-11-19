"""Preparation sheet: private by default, shared per section, revocable, audited."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from services.agents.prep import suggest
from services.api.main import create_app
from services.consent.roles import PERSONAS

SHEET = {
    "stage": "premarital", "values": ["v1"], "concerns": ["cost"], "worries_text": "private worry",
    "questions": [{"id": "general_0", "text": "What does my result mean in plain words?"}],
    "bring": ["report"], "share": [],
}


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    with TestClient(create_app("sqlite://")) as client:
        heads = {p: {"Authorization": "Bearer " + client.post("/api/auth/persona", json={"persona": p}).json()["access_token"]}
                 for p in PERSONAS}
        yield client, heads


def test_suggestions_are_deterministic_ordered_and_neutral():
    a = suggest("en", "pregnant", ["privacy", "cost"], 3)
    assert a == suggest("en", "pregnant", ["cost", "privacy"], 3)  # tick order never changes the output
    ids = [q["id"] for q in a["questions"]]
    assert ids[0] == "general_0" and len(ids) == len(set(ids)) and ids.index("cost_0") < ids.index("privacy_0")
    assert not suggest("ar", "pregnant", [])["placeholder"] and suggest("hi", "pregnant", [])["placeholder"]
    assert not any("should" in q["text"].lower() for q in a["questions"])


def test_nothing_reaches_the_counsellor_without_the_toggle(api):
    c, h = api
    assert c.put("/api/lifecycle/prep", headers=h["person_a"], json=SHEET).status_code == 200
    assert c.get("/api/lifecycle/prep-review/synthetic-a", headers=h["counsellor"]).status_code == 403
    assert c.get("/api/lifecycle/prep", headers=h["person_a"]).json()["sheet"]["worries_text"] == "private worry"


def test_only_switched_on_sections_are_shared_and_unsharing_revokes(api):
    c, h = api
    c.put("/api/lifecycle/prep", headers=h["person_a"], json={**SHEET, "share": ["questions", "bring"]})
    seen = c.get("/api/lifecycle/prep-review/synthetic-a", headers=h["counsellor"])
    assert seen.status_code == 200
    assert set(seen.json()["sections"]) == {"questions", "bring"}  # not the concerns, free text or values
    c.put("/api/lifecycle/prep", headers=h["person_a"], json={**SHEET, "share": []})
    assert c.get("/api/lifecycle/prep-review/synthetic-a", headers=h["counsellor"]).status_code == 403


def test_other_people_cannot_read_or_write_a_sheet(api):
    c, h = api
    c.put("/api/lifecycle/prep", headers=h["person_a"], json={**SHEET, "share": ["bring"]})
    assert c.get("/api/lifecycle/prep", headers=h["person_b"]).json()["sheet"] is None
    assert c.get("/api/lifecycle/prep-review/synthetic-a", headers=h["analyst"]).status_code == 403
    assert c.put("/api/lifecycle/prep", headers=h["counsellor"], json=SHEET).status_code == 403


def test_the_suggestions_route_serves_the_bank(api):
    c, h = api
    r = c.get("/api/lifecycle/prep-suggestions?stage=premarital&lang=ar&concerns=cost&tier=2", headers=h["person_a"])
    assert r.status_code == 200 and r.json()["questions"][0]["id"] == "general_0"
    assert c.get("/api/lifecycle/prep-suggestions?stage=bogus", headers=h["person_a"]).status_code == 422


def test_web_mock_bank_matches_the_reviewed_yaml():
    import json

    from services.agents.prep import bank

    web = json.loads((Path(__file__).parents[2] / "web/lib/fixtures/prep_bank.json").read_text(encoding="utf-8"))
    for lang in ("en", "ar"):
        assert web[lang] == json.loads(json.dumps(bank(lang)[0])), "run scripts/export_prep_bank.py"
