"""Family tree editor: a first-cousin couple built from scratch gets the engine's golden kinship (1/16 for phi of the
couple means their child's inbreeding is 1/16), impossible trees are refused, and saved people keep their details."""
import pytest
from fastapi.testclient import TestClient

from services.api.demo.path import _h
from services.api.main import create_app

PEOPLE = [{"id": i, "sex": s} for i, s in [("gf", "male"), ("gm", "female"), ("u1", "male"), ("u2", "female"),
                                          ("s1", "female"), ("s2", "male"), ("me", "female"), ("partner", "male")]]
PARENTS = [("gf", "u1"), ("gm", "u1"), ("gf", "u2"), ("gm", "u2"), ("u1", "me"), ("s1", "me"), ("u2", "partner"), ("s2", "partner")]
EDGES = [{"a_id": p, "b_id": c, "type": "parent_of", "confidence": "known"} for p, c in PARENTS]


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    monkeypatch.setenv("KINSIGHT_DEMO", "1")
    with TestClient(create_app("sqlite://")) as c:
        yield c


def test_first_cousins_built_in_the_editor_match_the_golden_value(client):
    r = client.post("/api/lifecycle/kinship", headers=_h(client, "person_a"),
                    json={"people": PEOPLE, "relationships": EDGES, "a": "me", "b": "partner"})
    assert r.status_code == 200 and r.json()["phi"] == 1 / 16 and r.json()["related"] is True


def test_unrelated_and_impossible_trees(client):
    h = _h(client, "person_a")
    unrelated = [e for e in EDGES if e["b_id"] != "partner"]
    assert client.post("/api/lifecycle/kinship", headers=h, json={"people": PEOPLE, "relationships": unrelated, "a": "me", "b": "partner"}).json()["phi"] == 0
    cycle = [*EDGES, {"a_id": "me", "b_id": "gf", "type": "parent_of", "confidence": "known"}]
    assert client.post("/api/lifecycle/kinship", headers=h, json={"people": PEOPLE, "relationships": cycle, "a": "me", "b": "partner"}).status_code == 422
    stranger = [*EDGES, {"a_id": "nobody", "b_id": "me", "type": "parent_of", "confidence": "known"}]
    assert client.post("/api/lifecycle/kinship", headers=h, json={"people": PEOPLE, "relationships": stranger, "a": "me", "b": "partner"}).status_code == 422
    assert client.post("/api/lifecycle/kinship", json={"people": PEOPLE, "relationships": EDGES, "a": "me", "b": "partner"}).status_code == 401


def test_saved_people_keep_label_living_and_tested_status(client):
    h = _h(client, "person_a")
    current = client.get("/api/me/pedigree", headers=h).json()
    people = [{**p, "label": "Grandad", "living": False, "tested": "not_tested"} if p["id"] == "gf" else p for p in current["people"]]
    rels = [{k: e[k] for k in ("a_id", "b_id", "type", "confidence")} for e in current["relationships"] if e["type"] == "parent_of"]
    saved = client.put("/api/me/pedigree", headers=h, json={"relationships": rels, "people": people})
    assert saved.status_code == 200
    gf = next(p for p in saved.json()["people"] if p["id"] == "gf")
    assert gf == {"id": "gf", "sex": "male", "label": "Grandad", "living": False, "tested": "not_tested"}
