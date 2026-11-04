import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from services.api.main import create_app
from services.consent.audit import verify_chain
from services.consent.models import AuditEvent, RateWindow
from services.consent.policy import reference
from services.consent.roles import PERSONAS
from services.consent.settings import settings
from services.lifecycle import safety, triage
from services.lifecycle.cascade import WhisperQueue


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


NEW_ROUTES = [
    ("POST", "triage", "counsellor", {"a": [], "b": [], "phi": 0.0}),
    ("POST", "whisper", "person_a", {"contact": "+971500000000", "gene_family": "CFTR"}),
    ("POST", "whisper/dispatch", "demo_operator", {"advance_hours": 100}),
    ("POST", "checkin", "person_a", {"instrument": "dcs", "answers": [0, 4]}),
    ("POST", "reclassify", "counsellor", {"archived": {"v1": 3}, "feed": {"v1": 5}}),
    ("PUT", "safe-vault", "person_a", {"pin": "1234", "decoy_pin": "9876"}),
    ("POST", "safe-vault/unlock", "person_a", {"pin": "1234"}),
    ("POST", "tamm", "counsellor", {"pairing_ref": "demo-pair", "role": "pcp"}),
    ("POST", "break-glass", "counsellor", {"attestors": ["d1", "d2"], "reason": "Demo emergency"}),
]


@pytest.mark.parametrize("method,path,persona,body", NEW_ROUTES)
def test_new_route_roles_and_strict_bodies(api, method, path, persona, body):
    c, h, _ = api
    url = "/api/lifecycle/" + path
    assert c.request(method, url, json=body).status_code == 401
    allowed = {"person_a", "person_b"} if persona == "person_a" else {persona}
    for wrong in set(PERSONAS) - allowed:
        assert c.request(method, url, json=body, headers=h[wrong]).status_code == 403
    for bad in ({}, {**body, "unexpected": True}):
        response = c.request(method, url, json=bad, headers=h[persona])
        assert response.status_code == 422
        assert "input" not in response.json()


@pytest.mark.parametrize("method,path,persona,body", NEW_ROUTES)
def test_new_routes_happy_path_and_audit(api, method, path, persona, body):
    c, h, app = api
    if path == "safe-vault/unlock":
        c.put("/api/lifecycle/safe-vault", headers=h[persona], json={"pin": "1234", "decoy_pin": "9876"})
    with app.state.sessions() as db:
        before = db.scalar(select(AuditEvent.id).order_by(AuditEvent.id.desc())) or 0
    response = c.request(method, "/api/lifecycle/" + path, headers=h[persona], json=body)
    assert response.status_code == 200, response.text
    out = response.json()
    if path == "triage":
        assert out == {**triage.evaluate([], [], 0.0), "is_synthetic": True}
    elif path == "whisper":
        assert out == {"status": "queued"}
    elif path == "whisper/dispatch":
        assert out == {"dispatched": 0}
    elif path == "checkin":
        assert out == {"score": 50.0, "flagged": True, "support_offered": True}
    elif path == "reclassify":
        assert out == {"alerts": safety.reclassification(body["archived"], body["feed"])}
    elif path == "safe-vault":
        assert out == {"status": "configured"}
    elif path == "safe-vault/unlock":
        assert out == {"view": "real"}
    elif path == "tamm":
        assert set(out) == safety.TAMM_KEYS | {"is_synthetic"}
        assert not {"gene", "variant", "compatibility", "risk", "findings"} & set(out)
        assert out == {**safety.tamm_attestation("demo-pair", "pcp", out["issued_at"]), "is_synthetic": True}
    else:
        assert out == {**safety.break_glass(body["attestors"], body["reason"]), "is_synthetic": True}
    with app.state.sessions() as db:
        event = db.scalar(select(AuditEvent).where(AuditEvent.id > before))
        assert event and event.is_synthetic and event.action != "role_denied"
        assert verify_chain(db)


@pytest.mark.parametrize("path,patch", [
    ("triage", {"phi": -0.1}), ("triage", {"phi": 0.51}),
    ("triage", {"pregnant_days": 301}), ("triage", {"pregnant_days": -1}),
    ("triage", {"dcs": 101}), ("triage", {"teach_back_failures": 11}),
    ("triage", {"a": [{}] * 201}), ("triage", {"b": [{}] * 201}),
    ("whisper", {"contact": "123456"}), ("whisper", {"contact": "1" * 21}),
    ("whisper", {"contact": "+971 50000000"}), ("whisper", {"contact": "١" * 10}),
    ("whisper", {"gene_family": "bad gene"}), ("whisper", {"gene_family": "A" * 65}),
    ("whisper/dispatch", {"advance_hours": -1}), ("whisper/dispatch", {"advance_hours": 101}),
    ("whisper/dispatch", {"advance_hours": True}),
    ("checkin", {"answers": [5]}), ("checkin", {"answers": [True]}),
    ("checkin", {"answers": ["0"]}), ("checkin", {"answers": ["yes"]}),
    ("checkin", {"answers": []}), ("checkin", {"answers": [0] * 17}),
    ("checkin", {"answers": None}), ("checkin", {"total": 10}),
    ("checkin", {"instrument": "low_literacy_dcs", "answers": ["yes"] * 9}),
    ("checkin", {"instrument": "low_literacy_dcs", "answers": [0] * 10}),
    ("checkin", {"instrument": "low_literacy_dcs", "answers": ["maybe"] * 10}),
    ("checkin", {"instrument": "pagis", "answers": None, "total": -1}),
    ("checkin", {"instrument": "pagis", "answers": None, "total": 201}),
    ("checkin", {"instrument": "pagis", "answers": None}),
    ("reclassify", {"archived": {"bad key": 3}}), ("reclassify", {"feed": {"v1": 6}}),
    ("reclassify", {"feed": {"v1": True}}), ("reclassify", {"archived": {"x" * 65: 3}}),
    ("reclassify", {"archived": {str(i): 3 for i in range(201)}}),
    ("reclassify", {"feed": {str(i): 3 for i in range(201)}}),
    ("safe-vault", {"pin": "123"}), ("safe-vault", {"decoy_pin": "1" * 9}),
    ("safe-vault", {"pin": "9876"}), ("safe-vault", {"pin": "１２３４"}),
    ("safe-vault/unlock", {"pin": "abcd"}),
    ("tamm", {"pairing_ref": "x" * 65}), ("tamm", {"role": "person"}),
    ("break-glass", {"attestors": []}), ("break-glass", {"attestors": ["d"] * 5}),
    ("break-glass", {"attestors": ["x" * 65, "d"]}),
    ("break-glass", {"reason": ""}), ("break-glass", {"reason": "x" * 301}),
])
def test_new_route_bounds(api, path, patch):
    c, h, _ = api
    method, _, persona, body = next(row for row in NEW_ROUTES if row[1] == path)
    response = c.request(method, "/api/lifecycle/" + path, json={**body, **patch}, headers=h[persona])
    assert response.status_code == 422, response.text


@pytest.mark.parametrize("patch", [
    {"gene": "bad gene"}, {"gene": "x" * 65}, {"inheritance": "AD"}, {"zygosity": "OTHER"},
    {"acmg_class": 0}, {"acmg_class": 6}, {"acmg_class": True},
    {"requires_orthogonal": "true"}, {"orthogonal_verified": 1}, {"allele": "x" * 65},
    {"allele": "<script>"}, {"extra": "secret"},
])
def test_triage_gene_validation(api, patch):
    c, h, _ = api
    gene = {"gene": "CFTR", "inheritance": "AR", "zygosity": "HET", "acmg_class": 5, **patch}
    response = c.post("/api/lifecycle/triage", headers=h["counsellor"], json={"a": [gene], "b": [], "phi": 0.0})
    assert response.status_code == 422
    assert "CFTR" not in response.text and "secret" not in response.text


def test_triage_only_shared_gene_names_escape(api):
    c, h, _ = api
    shared = {"gene": "CFTR", "inheritance": "AR", "zygosity": "HET", "acmg_class": 5,
              "requires_orthogonal": True, "orthogonal_verified": False, "allele": "v1"}
    private = {**shared, "gene": "GJB2", "zygosity": "HOM"}
    body = {"a": [shared, {**shared, "gene": "MEFV"}], "b": [{**shared, "allele": "v2"}, private],
            "phi": 0.0625, "pregnant_days": 60, "dcs": 40, "teach_back_failures": 2}
    response = c.post("/api/lifecycle/triage", headers=h["counsellor"], json=body)
    assert response.status_code == 200
    out = response.json()
    assert out.pop("shared_genes") == ["CFTR"]
    assert all(g not in str(out) for g in ("CFTR", "GJB2", "MEFV", "v1", "v2"))
    assert out["private_counts"] == {"a": 0, "b": 1} and out["hold_release"] and out["sla_hours"] == 12


def test_whisper_response_audit_and_rows_have_no_sender_link(api, monkeypatch):
    c, h, app = api
    rows = []
    enqueue = WhisperQueue.enqueue

    def capture(queue, *args, **kwargs):
        row = enqueue(queue, *args, **kwargs)
        rows.append(row)
        return row

    monkeypatch.setattr(WhisperQueue, "enqueue", capture)
    for persona in ("person_a", "person_b"):
        response = c.post("/api/lifecycle/whisper", headers=h[persona],
                          json={"contact": "+971500000000", "gene_family": "CFTR"})
        assert response.status_code == 200 and response.json() == {"status": "queued"}
    with app.state.sessions() as db:
        events = db.scalars(select(AuditEvent).where(AuditEvent.action == "whisper_queued")).all()
        assert len(events) == 2 and events[0].actor_ref != events[1].actor_ref
        for event in events:
            assert event.resource_ref == reference("whisper", b"synthetic-only-audit-salt-32-bytes")
            values = str({col.key: getattr(event, col.key) for col in AuditEvent.__table__.columns})
            assert all(secret not in values for secret in ("+971500000000", "CFTR", *[v.code for v in rows]))
        assert verify_chain(db)
    for row in rows:
        assert set(vars(row)) == {"code", "phone_sha256", "gene_family", "send_at", "status"}
        assert "synthetic-a" not in repr(row) and "synthetic-b" not in repr(row)
        assert "+971500000000" not in repr(row)
    url = "/api/lifecycle/whisper/dispatch"
    assert c.post(url, headers=h["demo_operator"], json={"advance_hours": 0}).json() == {"dispatched": 0}
    assert c.post(url, headers=h["demo_operator"], json={"advance_hours": 100}).json() == {"dispatched": 2}
    assert c.post(url, headers=h["demo_operator"], json={"advance_hours": 100}).json() == {"dispatched": 0}


@pytest.mark.parametrize("body,score,flagged", [
    ({"instrument": "dcs", "answers": [0, 0]}, 0, False),
    ({"instrument": "dcs", "answers": [1, 2]}, 37.5, False),
    ({"instrument": "low_literacy_dcs", "answers": ["yes"] * 5 + ["no"] * 5}, 50, True),
    ({"instrument": "low_literacy_dcs", "answers": ["yes"] * 10}, 0, False),
    ({"instrument": "pagis", "answers": None, "total": 95}, 95, True),
    ({"instrument": "pagis", "total": 96}, 96, False),
])
def test_checkin_instruments(api, body, score, flagged):
    c, h, _ = api
    response = c.post("/api/lifecycle/checkin", headers=h["person_a"], json=body)
    assert response.status_code == 200
    assert response.json() == {"score": score, "flagged": flagged, "support_offered": flagged}


def test_vault_hashes_isolation_decoy_audit_and_lockout(api, monkeypatch):
    c, h, app = api
    checked = []
    check = safety.check_pins

    def capture(pin, real, decoy):
        checked.append((real, decoy))
        return check(pin, real, decoy)

    monkeypatch.setattr(safety, "check_pins", capture)
    c.put("/api/lifecycle/safe-vault", headers=h["person_a"], json={"pin": "1234", "decoy_pin": "9876"})
    url = "/api/lifecycle/safe-vault/unlock"
    real = c.post(url, headers=h["person_a"], json={"pin": "1234"})
    decoy = c.post(url, headers=h["person_a"], json={"pin": "9876"})
    assert real.status_code == decoy.status_code == 200
    assert real.json() == {"view": "real"} and decoy.json() == {"view": "decoy"}
    assert set(real.json()) == set(decoy.json())
    assert real.headers["cache-control"] == decoy.headers["cache-control"] == "no-store"
    assert real.headers["content-type"] == decoy.headers["content-type"]
    assert checked[0] == checked[1]
    assert all(len(value.split(":")) == 2 and value not in {"1234", "9876"} for value in checked[0])
    with app.state.sessions() as db:
        events = db.scalars(select(AuditEvent).where(AuditEvent.action == "safe_vault_unlocked")).all()
        assert len(events) == 2
        fields = ("actor_ref", "action", "resource_type", "resource_ref", "decision", "reason_code", "consent_ids")
        assert {k: getattr(events[0], k) for k in fields} == {k: getattr(events[1], k) for k in fields}
    absent = c.post(url, headers=h["person_b"], json={"pin": "1234"})
    wrong = c.post(url, headers=h["person_a"], json={"pin": "0000"})
    assert absent.status_code == wrong.status_code == 403
    assert absent.json() == wrong.json() == {"detail": "Access unavailable", "is_synthetic": True}
    assert [c.post(url, headers=h["person_a"], json={"pin": "0000"}).status_code for _ in range(4)] == [403] * 4
    assert c.post(url, headers=h["person_a"], json={"pin": "1234"}).status_code == 429
    # Reconfiguring PINs cannot clear the session lockout.
    c.put("/api/lifecycle/safe-vault", headers=h["person_a"], json={"pin": "5678", "decoy_pin": "9876"})
    assert c.post(url, headers=h["person_a"], json={"pin": "5678"}).status_code == 429
    c.put("/api/lifecycle/safe-vault", headers=h["person_b"], json={"pin": "1234", "decoy_pin": "9876"})
    assert c.post(url, headers=h["person_b"], json={"pin": "1234"}).json() == {"view": "real"}
    with app.state.sessions() as db:
        assert verify_chain(db)


@pytest.mark.parametrize("attestors,reason", [(["d1"], "Demo"), (["d1", "d1"], "Demo"), (["d1", "d2"], " ")])
def test_break_glass_refusal_is_audited(api, attestors, reason):
    c, h, app = api
    response = c.post("/api/lifecycle/break-glass", headers=h["counsellor"],
                      json={"attestors": attestors, "reason": reason})
    assert response.status_code == 403
    with app.state.sessions() as db:
        assert db.scalar(select(AuditEvent).where(AuditEvent.action == "break_glass_refused"))
        assert verify_chain(db)


@pytest.mark.parametrize("method,path,persona,body", [row for row in NEW_ROUTES if row[2] == "person_a"])
def test_person_submissions_are_rate_limited(api, method, path, persona, body):
    c, h, app = api
    c.post("/api/lifecycle/checkin", headers=h[persona], json={"instrument": "dcs", "answers": [0]})
    with app.state.sessions() as db:
        row = db.scalar(select(RateWindow))
        row.requests = settings().rate_limit_requests
        db.commit()
    assert c.request(method, "/api/lifecycle/" + path, json=body, headers=h[persona]).status_code == 429


def test_reclassify_live_uses_clinvar_and_sends_only_ids(api, monkeypatch):
    from services.lifecycle import clinvar

    seen = {}

    def fake(ids):
        seen["ids"] = ids
        return {"7105": {"acmg_class": 5, "label": "Pathogenic", "last_evaluated": "2004/03/03"},
                "42": {"acmg_class": 3, "label": "Uncertain significance", "last_evaluated": ""}}

    monkeypatch.setattr(clinvar, "fetch", fake)
    c, h, _ = api
    body = {"archived": {"7105": 3, "42": 5}}
    assert c.post("/api/lifecycle/reclassify/live", json=body, headers=h["person_a"]).status_code == 403
    r = c.post("/api/lifecycle/reclassify/live", json=body, headers=h["counsellor"])
    assert r.status_code == 200 and seen["ids"] == ["7105", "42"]
    assert {a["variant"]: a["direction"] for a in r.json()["alerts"]} == {"7105": "upgraded", "42": "downgraded"}
    assert c.post("/api/lifecycle/reclassify/live", json={"archived": {"abc": 3}}, headers=h["counsellor"]).status_code == 422

    def down(ids):
        raise clinvar.SourceUnavailable("x")

    monkeypatch.setattr(clinvar, "fetch", down)
    assert c.post("/api/lifecycle/reclassify/live", json=body, headers=h["counsellor"]).status_code == 503


def test_frequency_route_roles_validation_and_outage(api, monkeypatch):
    from services.lifecycle import gnomad

    monkeypatch.setattr(gnomad, "fetch", lambda ids: {i: {"allele_frequency": 0.01} for i in ids})
    c, h, _ = api
    body = {"variants": ["7-117559590-ATCT-A"]}
    assert c.post("/api/lifecycle/frequency", json=body, headers=h["person_a"]).status_code == 403
    for who in ("counsellor", "analyst"):
        r = c.post("/api/lifecycle/frequency", json=body, headers=h[who])
        assert r.status_code == 200 and r.json()["source"] == "gnomAD v4"
    assert c.post("/api/lifecycle/frequency", json={"variants": ["nope"]}, headers=h["analyst"]).status_code == 422
    assert c.post("/api/lifecycle/frequency", json={"variants": []}, headers=h["analyst"]).status_code == 422

    def down(ids):
        raise gnomad.SourceUnavailable("x")

    monkeypatch.setattr(gnomad, "fetch", down)
    assert c.post("/api/lifecycle/frequency", json=body, headers=h["analyst"]).status_code == 503
