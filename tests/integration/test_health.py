"""/api/health makes a real database round trip and reports it, without turning a database problem into a restart."""
from fastapi.testclient import TestClient

from services.api.main import create_app


def test_health_reports_a_reachable_database(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    with TestClient(create_app("sqlite://")) as c:
        body = c.get("/api/health").json()
    assert body["status"] == "ok" and body["database_reachable"] is True and body["database"]["provider"] == "local"


def test_an_unreachable_database_is_degraded_not_down(monkeypatch, tmp_path):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    with TestClient(create_app(f"sqlite:///{tmp_path / 'h.db'}")) as c:
        engine = c.app.state.sessions.kw["bind"]
        real = engine.connect

        def broken():
            raise OSError("database gone")

        engine.connect = broken
        try:
            r = c.get("/api/health")
        finally:
            engine.connect = real
    assert r.status_code == 200 and r.json()["status"] == "degraded" and r.json()["database_reachable"] is False
