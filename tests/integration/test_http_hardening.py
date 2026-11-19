"""HTTP hardening for the API: CORS allow-list, body cap, headers. Signed lab webhooks, replay and upload limits are
covered in test_lab_feed.py, test_lab_sandbox.py and test_pilot_reports.py."""
import pytest
from fastapi.testclient import TestClient

from services.api.main import create_app


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    with TestClient(create_app("sqlite://")) as c:
        yield c


def test_cross_origin_requests_are_not_allowed_by_default(client):
    pre = client.options("/api/me", headers={"origin": "https://evil.example", "access-control-request-method": "GET"})
    assert "access-control-allow-origin" not in pre.headers
    got = client.get("/api/health", headers={"origin": "https://evil.example"})
    assert "access-control-allow-origin" not in got.headers


def test_an_allow_listed_origin_is_the_only_one_echoed(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_CORS_ORIGINS", "https://app.example")
    with TestClient(create_app("sqlite://")) as c:
        ok = c.get("/api/health", headers={"origin": "https://app.example"})
        no = c.get("/api/health", headers={"origin": "https://evil.example"})
    assert ok.headers["access-control-allow-origin"] == "https://app.example"
    assert "access-control-allow-origin" not in no.headers


def test_oversized_bodies_are_refused_before_routing(client):
    r = client.post("/api/auth/persona", content=b"x" * 1_048_577, headers={"content-type": "application/json"})
    assert r.status_code == 413


def test_api_responses_carry_hardening_headers_and_docs_stay_usable(client):
    h = client.get("/api/health").headers
    assert h["x-content-type-options"] == "nosniff" and h["cache-control"] == "no-store"
    assert "frame-ancestors 'none'" in h["content-security-policy"]
    assert "content-security-policy" not in client.get("/docs").headers
