"""The counsellor queue reads in a bounded number of SQL statements, however long the caseload (see commit a8494f9)."""
from fastapi.testclient import TestClient
from sqlalchemy import event

from services.api.demo.path import _h
from services.api.main import create_app


def statements_for(client, path, headers) -> int:
    engine = client.app.state.sessions.kw["bind"]
    seen: list[str] = []

    def count(conn, cursor, statement, *args):
        seen.append(statement)

    event.listen(engine, "before_cursor_execute", count)
    try:
        assert client.get(path, headers=headers).status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", count)
    return len(seen)


def test_queue_page_uses_a_bounded_number_of_statements(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    monkeypatch.setenv("KINSIGHT_DEMO", "1")
    with TestClient(create_app("sqlite://")) as c:
        h = _h(c, "counsellor")
        small = statements_for(c, "/api/counsellor/queue?limit=6", h)
        large = statements_for(c, "/api/counsellor/queue?limit=24", h)
    assert large <= 10, large      # was ~500 before bulk loading (a8494f9) and 29 before the shared consent read
    assert large == small, (small, large)  # does not grow with the page size


def test_preloaded_consents_give_exactly_the_same_decision():
    import time

    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import Session

    from services.consent.models import Base, Consent
    from services.consent.policy import Actor, ResourceRef, decide

    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    now = time.time()
    salt = b"synthetic-only-audit-salt-32-bytes"
    with Session(engine) as db:
        def grant(cid, rid, **kw):
            base = dict(id=cid, grantor_id="p", grantee_id="c", resource_type="case", resource_id=rid, scope="couple_summary",
                        fields=["status", "tier"], condition_ids=[], purpose="counselling", granted_at=now - 10,
                        expires_at=now + 100, revoked_at=None, text_shown_hash="x", is_synthetic=True)
            db.add(Consent(**{**base, **kw}))
        grant("g1", "case1")
        grant("g2", "case2", revoked_at=now - 1)
        grant("g3", "case3", expires_at=now - 1)
        grant("g4", "case4", purpose="own_care")
        grant("g5", "case5", grantor_id="someone-else")
        db.commit()
        candidates = list(db.scalars(select(Consent)))
        actor = Actor("c", "counsellor")
        for rid in ("case1", "case2", "case3", "case4", "case5", "case6"):
            ref = ResourceRef("case", rid, "p", owner_viewed=True, assigned_to="c", assignment_expires_at=now + 100,
                              assignment_reason="test")
            a = decide(actor, ref, "counselling", {"status", "tier"}, session=db, audit_salt=salt, audit_allowed=False)
            b = decide(actor, ref, "counselling", {"status", "tier"}, session=db, audit_salt=salt, audit_allowed=False,
                       candidates=candidates)
            assert a == b, rid
