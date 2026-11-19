"""Concurrent requests must not fork the hash-chained audit log or fail with 409 (both write the next link)."""
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from services.api.demo_path import _h
from services.api.main import create_app
from services.consent.audit import verify_chain


def test_parallel_audited_reads_all_succeed_and_keep_one_chain(monkeypatch, tmp_path):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    with TestClient(create_app(f"sqlite:///{tmp_path / 'race.db'}")) as c:
        heads = [_h(c, "person_a"), _h(c, "person_b"), _h(c, "counsellor")]
        paths = ["/api/me", "/api/me/results", "/api/lifecycle/prep", "/api/me/consents"]

        def hit(i: int) -> int:
            h = heads[i % 2]
            return c.get(paths[i % len(paths)], headers=h).status_code

        with ThreadPoolExecutor(max_workers=12) as pool:
            codes = list(pool.map(hit, range(120)))
        assert codes.count(409) == 0, codes
        with c.app.state.sessions() as db:
            assert verify_chain(db)
