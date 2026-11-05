import os

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
    url = os.environ.get("KINSIGHT_TEST_DATABASE_URL")  # optional: run this file against a real Postgres
    if url:
        from sqlalchemy import create_engine

        from services.consent.models import Base
        from services.lifecycle.store import LifecycleBase

        engine = create_engine(url)
        LifecycleBase.metadata.drop_all(engine)
        Base.metadata.drop_all(engine)
        engine.dispose()
    app = create_app(url or "sqlite://")
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


def test_state_survives_a_restart(monkeypatch, tmp_path):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    url = f"sqlite:///{tmp_path / 'lifecycle.db'}"

    def session(app, client, persona):
        token = client.post("/api/auth/persona", json={"persona": persona}).json()["access_token"]
        return {"Authorization": "Bearer " + token}

    with TestClient(create_app(url)) as c:
        a, b, rel = (session(None, c, p) for p in ("person_a", "person_b", "relative"))
        pairing = c.post("/api/lifecycle/pairing", headers=a).json()
        c.post(f"/api/lifecycle/pairing/{pairing['id']}/confirm", json={"pin": pairing["pin"]}, headers=b)
        advanced = c.post("/api/lifecycle/tracker/advance", headers=a).json()["stage"]
        tok = c.post("/api/lifecycle/cascade", json={"condition_id": "cah"}, headers=a).json()["token"]
        assert c.post("/api/lifecycle/cascade/redeem", json={"token": tok}, headers=rel).status_code == 200
        c.put("/api/lifecycle/safe-vault", json={"pin": "1234", "decoy_pin": "5678"}, headers=a)
    with TestClient(create_app(url)) as c:                      # a fresh app on the same database
        a, b, rel = (session(None, c, p) for p in ("person_a", "person_b", "relative"))
        assert c.get(f"/api/lifecycle/pairing/{pairing['id']}", headers=a).json()["status"] == "active"
        assert c.get("/api/lifecycle/tracker", headers=a).json()["stage"] == advanced
        assert c.post("/api/lifecycle/cascade/redeem", json={"token": tok}, headers=rel).status_code == 403  # still single use
        assert c.post("/api/lifecycle/safe-vault/unlock", json={"pin": "1234"}, headers=a).json()["view"] == "real"
        assert c.post(f"/api/lifecycle/pairing/{pairing['id']}/revoke", headers=b).json()["status"] == "revoked"
    with TestClient(create_app(url)) as c:
        a = session(None, c, "person_a")
        assert c.get(f"/api/lifecycle/pairing/{pairing['id']}", headers=a).json()["status"] == "revoked"


def test_host_style_database_urls_get_the_psycopg_driver(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    for given in ("postgres://u:p@localhost/db", "postgresql://u:p@localhost/db"):
        app = create_app(given)  # engine is created lazily; no connection is made here
        assert app.state.engine.url.drivername == "postgresql+psycopg"


def test_health_names_the_database_kind_without_secrets(api):
    from sqlalchemy.engine import make_url

    from services.api.main import database_kind

    c, _, _ = api
    assert c.get("/api/health").json()["database"] == {"dialect": "sqlite", "provider": "local"}
    assert database_kind(make_url("postgresql+psycopg://u:secret@ep-x.us-east-2.aws.neon.tech/db")) == {"dialect": "postgresql", "provider": "neon"}
    assert database_kind(make_url("postgresql+psycopg://u:p@dpg-1.oregon-postgres.render.com/db"))["provider"] == "render"
    assert database_kind(make_url("postgresql://u:p@dpg-abc-a/db"))["provider"] == "render"
    assert database_kind(make_url("postgresql://u:p@db.example.org/db"))["provider"] == "external"
    assert "secret" not in str(database_kind(make_url("postgresql://u:secret@h/db")))


ADDED_ROUTES = [
    ("POST", "measures/mmic", {"knowledge_correct": 5, "knowledge_total": 10, "attitude": "favourable", "acted": True}),
    ("POST", "measures/gcos", {"answers": [1] * 24}),
    ("POST", "nasab", {"relations": ["first_cousins"]}),
    ("POST", "gestation", {"days_since_lmp": 70}),
    ("GET", "booking/slots?sla_hours=12", None),
    ("POST", "booking", {"slot_at": 0}),
    ("POST", "booking/missing/cancel", None),
    ("GET", "reengagement?months_since=6", None),
]


@pytest.mark.parametrize("method,path,body", ADDED_ROUTES)
def test_added_routes_role_gates_and_auth(api, method, path, body):
    c, h, _ = api
    url = "/api/lifecycle/" + path
    assert c.request(method, url, json=body).status_code == 401
    allowed = {"person_a", "person_b", "relative"} if path == "nasab" else {"person_a", "person_b"}
    for persona in set(PERSONAS) - allowed:
        assert c.request(method, url, json=body, headers=h[persona]).status_code == 403
    if body is not None:
        assert c.request(method, url, json={**body, "extra": True}, headers=h["person_a"]).status_code == 422


@pytest.mark.parametrize("path,body", [
    ("measures/mmic", {"knowledge_correct": 11, "knowledge_total": 10, "attitude": "favourable", "acted": True}),
    ("measures/mmic", {"knowledge_correct": 0, "knowledge_total": 0, "attitude": "favourable", "acted": True}),
    ("measures/mmic", {"knowledge_correct": True, "knowledge_total": 10, "attitude": "favourable", "acted": True}),
    ("measures/mmic", {"knowledge_correct": 5, "knowledge_total": 10, "attitude": "unknown", "acted": True}),
    ("measures/mmic", {"knowledge_correct": 5, "knowledge_total": 10, "attitude": "favourable", "acted": 1}),
    ("measures/gcos", {"answers": [1] * 23}), ("measures/gcos", {"answers": [1] * 25}),
    ("measures/gcos", {"answers": [0] * 24}), ("measures/gcos", {"answers": [8] * 24}),
    ("measures/gcos", {"answers": [True] * 24}), ("measures/gcos", {"answers": [1] * 24, "pre": [1]}),
    ("nasab", {"relations": ["unknown"]}), ("nasab", {"relations": ["none"] * 5}),
    ("gestation", {"days_since_lmp": -1}), ("gestation", {"days_since_lmp": 301}),
    ("gestation", {"days_since_lmp": "70"}), ("booking", {"slot_at": -1}),
    ("booking", {"slot_at": True}),
])
def test_added_strict_validation(api, path, body):
    c, h, _ = api
    assert c.post("/api/lifecycle/" + path, json=body, headers=h["person_a"]).status_code == 422


@pytest.mark.parametrize("path", ["booking/slots?sla_hours=0", "booking/slots?sla_hours=121",
    "booking/slots?sla_hours=abc", "reengagement?months_since=-1", "reengagement?months_since=1201",
    "reengagement?months_since=1.5", "reengagement"])
def test_added_query_bounds(api, path):
    c, h, _ = api
    assert c.get("/api/lifecycle/" + path, headers=h["person_a"]).status_code == 422


def test_added_routes_results_and_audits(api):
    c, h, app = api
    assert c.post("/api/lifecycle/measures/mmic", headers=h["person_a"], json=ADDED_ROUTES[0][2]).json()["informed"]
    assert c.post("/api/lifecycle/measures/gcos", headers=h["person_a"],
                  json={"answers": [7] * 24, "pre": [1] * 24}).json() == {"total": 168, "gain": 144}
    assert c.post("/api/lifecycle/nasab", headers=h["relative"], json={"relations": ["double_first_cousins"]}).json()["f"] == 0.125
    assert c.post("/api/lifecycle/gestation", headers=h["person_a"], json={"days_since_lmp": 120}).json()["past_day_120"] is False
    for months, due in [(0, None), (5, None), (6, 6), (7, 6), (12, 12), (13, 12)]:
        assert c.get(f"/api/lifecycle/reengagement?months_since={months}", headers=h["person_a"]).json() == {"due_month": due}
    with app.state.sessions() as db:
        actions = set(db.scalars(select(AuditEvent.action)))
        assert {"mmic_scored", "gcos_scored", "nasab_evaluated", "gestation_evaluated", "reengagement_checked"} <= actions
        assert verify_chain(db)


def test_booking_idempotency_ownership_cancel_and_audit(api):
    c, h, app = api
    url = "/api/lifecycle/booking"
    offered = c.get(url + "/slots", headers=h["person_a"]).json()["slots"]
    assert c.post(url, headers=h["person_a"], json={"slot_at": 1}).status_code == 422
    body = {"slot_at": offered[0]}
    response = c.post(url, headers=h["person_a"], json=body)
    assert response.status_code == 200
    booked = response.json()
    assert c.post(url, headers=h["person_a"], json=body).json() == booked
    assert c.post(url, headers=h["person_a"], json={"slot_at": offered[1]}).status_code == 409
    cancel = url + f"/{booked['id']}/cancel"
    assert c.post(cancel, headers=h["person_b"]).status_code == 403
    assert c.post(cancel, headers=h["person_a"]).json()["status"] == "cancelled"
    assert c.post(cancel, headers=h["person_a"]).json()["status"] == "cancelled"
    assert c.post(url, headers=h["person_a"], json=body).json()["id"] != booked["id"]
    with app.state.sessions() as db:
        actions = set(db.scalars(select(AuditEvent.action)))
        assert {"booking_slots_viewed", "booking_created", "booking_cancelled"} <= actions
        assert verify_chain(db)


def test_certificate_gate_tracks_the_person_and_fallback(api, monkeypatch):
    from services.agents.case_graph import cfg_of
    from services.agents.quiz import build_quiz
    from services.api.backend import CASE, A, B, DemoBackend

    c, h, app = api
    assert not c.get("/api/lifecycle/certificate", headers=h["person_a"]).json()["locked"]
    backend = DemoBackend()
    app.state.backend = backend
    assert c.get("/api/lifecycle/certificate", headers=h["person_a"]).json()["locked_reason"] == "teach_back"
    with app.state.sessions() as db:
        backend.op_decision(CASE, {"decision": "approve", "reason_code": "reviewed"}, db)
        q = build_quiz(backend.assessment, "en")
        answers = ["abc".index(q.key[item.id]) for item in q.questions]
        assert backend.op_quiz_answers(CASE, {"answers": answers, "actor_id": A}, db)["status"] == "passed"
    unlocked = c.get("/api/lifecycle/certificate", headers=h["person_a"]).json()
    assert unlocked["locked"] is False and unlocked["locked_reason"] is None
    assert c.get("/api/lifecycle/certificate", headers=h["person_b"]).json()["locked"] is True
    assert backend.op_teach_back_status(B, None, None)["locked"]
    with app.state.sessions() as db:
        wrong = [(answer + 1) % 3 for answer in answers]
        assert backend.op_quiz_answers(CASE, {"answers": wrong, "actor_id": B}, db)["status"] == "counsellor_offered"
        assert backend.op_teach_back_status(B, None, db)["locked"]
        assert backend.op_quiz_answers(CASE, {"answers": answers, "actor_id": B}, db)["status"] == "passed"
    assert not c.get("/api/lifecycle/certificate", headers=h["person_b"]).json()["locked"]
    assert not c.get("/api/lifecycle/certificate", headers=h["demo_operator"]).json()["locked"]
    backend.graph.update_state(cfg_of(CASE), {"quiz_result": {"passed": False}, "teach_back_passed_actors": []})
    assert c.get("/api/lifecycle/certificate", headers=h["person_a"]).json()["locked"]


def test_booking_survives_restart_and_database_enforces_one_active(monkeypatch, tmp_path):
    from sqlalchemy.exc import IntegrityError

    from services.lifecycle.store import LcBooking

    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    url = f"sqlite:///{tmp_path / 'booking.db'}"
    for iteration in range(2):
        app = create_app(url)
        with TestClient(app) as c:
            token = c.post("/api/auth/persona", json={"persona": "person_a"}).json()["access_token"]
            headers = {"Authorization": "Bearer " + token}
            if iteration == 0:
                at = c.get("/api/lifecycle/booking/slots", headers=headers).json()["slots"][0]
                booked = c.post("/api/lifecycle/booking", headers=headers, json={"slot_at": at}).json()
            else:
                assert c.post("/api/lifecycle/booking", headers=headers, json={"slot_at": at}).json() == booked
                with app.state.sessions() as db:
                    db.add(LcBooking(id="duplicate", actor="synthetic-a", slot_at=at, status="active"))
                    with pytest.raises(IntegrityError):
                        db.commit()


@pytest.mark.parametrize("method,path,body", ADDED_ROUTES)
def test_added_routes_rate_limit(api, method, path, body):
    c, h, app = api
    c.get("/api/lifecycle/booking/slots", headers=h["person_a"])
    with app.state.sessions() as db:
        db.scalar(select(RateWindow)).requests = settings().rate_limit_requests
        db.commit()
    assert c.request(method, "/api/lifecycle/" + path, json=body, headers=h["person_a"]).status_code == 429



def test_certificate_unlocks_through_quiz_api(api):
    from services.agents.quiz import build_quiz
    from services.api.backend import CASE, A, DemoBackend

    backend = DemoBackend()
    app = create_app("sqlite://", backend=backend)
    with TestClient(app) as c:
        headers = {}
        for persona in ("person_a", "person_b"):
            token = c.post("/api/auth/persona", json={"persona": persona}).json()["access_token"]
            headers[persona] = {"Authorization": "Bearer " + token}
        with app.state.sessions() as db:
            backend.op_decision(CASE, {"decision": "approve", "reason_code": "reviewed"}, db)
            db.commit()
        quiz = build_quiz(backend.assessment, "en")
        answers = ["abc".index(quiz.key[q.id]) for q in quiz.questions]
        for persona, actor in (("person_a", A),):
            before = c.get("/api/lifecycle/certificate", headers=headers[persona])
            assert before.json()["locked"]
            # The owner can answer their case quiz through the usual policy gate.
            result = c.post(f"/api/cases/{CASE}/quiz/answers", headers=headers[persona], json={"answers": answers})
            assert result.status_code == 200, result.text
            assert result.json()["status"] == "passed"
            assert not c.get("/api/lifecycle/certificate", headers=headers[persona]).json()["locked"]
            assert actor in backend.values()["teach_back_passed_actors"]


def test_demo_caseload_and_family_tree_are_populated(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    monkeypatch.setenv("KINSIGHT_DEMO", "1")
    with TestClient(create_app("sqlite://")) as c:
        head = lambda p: {"Authorization": "Bearer " + c.post("/api/auth/persona", json={"persona": p}).json()["access_token"]}  # noqa: E731
        page = c.get("/api/counsellor/queue", headers=head("counsellor")).json()
        assert 10 <= len(page) <= 12 and {row["tier"] for row in page} == {1, 2, 3}   # a page, with a realistic tier mix
        queue = c.get("/api/counsellor/queue?limit=50", headers=head("counsellor")).json()
        assert len(queue) >= 35 and all(row["id"] and row["status"] and row["due_at"] for row in queue)
        tiers = [row["tier"] for row in queue]
        assert tiers == sorted(tiers, reverse=True)                    # most urgent first
        first = queue[0]["id"]
        brief = c.get(f"/api/counsellor/cases/{first}/brief", headers=head("counsellor"))
        assert brief.status_code == 200 and brief.json()["brief"][0].startswith("tier_")
        # the family circle: three generations, with who is related to whom
        ped = c.get("/api/me/pedigree", headers=head("person_a")).json()
        assert {p["id"] for p in ped["people"]} >= {"synthetic-a", "synthetic-b", "gf", "gm"}
        assert sum(1 for r in ped["relationships"] if r["type"] == "parent_of") == 8
        assert ped["related"] == [["synthetic-a", "synthetic-b"]]


def test_access_log_shows_only_the_persons_own_trail(api):
    c, h, _ = api
    c.get("/api/me/results", headers=h["person_a"])
    log = c.get("/api/me/access-log", headers=h["person_a"]).json()
    assert log["events"] and all(set(e) == {"when", "who", "action", "resource", "outcome", "reason"} for e in log["events"])
    assert {e["who"] for e in log["events"]} <= {"you", "someone"}
    assert "synthetic-a" not in str(log)                         # hashed references and no ids are ever returned
    assert c.get("/api/me/access-log", headers=h["person_b"]).json()["events"] != log["events"]
    assert c.get("/api/me/access-log", headers=h["analyst"]).status_code == 403
    assert c.get("/api/me/access-log").status_code == 401
