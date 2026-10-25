import pytest
from fastapi.testclient import TestClient

from services.api.demo_path import run_demo_path
from services.api.main import create_app


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    monkeypatch.setenv("KINSIGHT_DEMO", "1")
    with TestClient(create_app("sqlite://")) as c:
        yield c


def test_demo_script_steps_through_the_api(client):
    assert run_demo_path(client, log=lambda *a: None)["ok"]
