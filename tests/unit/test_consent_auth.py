import pytest

from services.api.auth import issue_token, verify_token
from services.consent.roles import PERSONAS


def test_tokens_are_signed_expire_and_use_fixed_personas(monkeypatch):
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-test-secret-32-bytes")
    monkeypatch.setattr("services.api.auth.time.time", lambda: 1000)
    for persona, actor in PERSONAS.items():
        token = issue_token(persona)
        assert verify_token(token).actor == actor
        with pytest.raises(ValueError):
            verify_token("X" + token[1:])
    monkeypatch.setattr("services.api.auth.time.time", lambda: 10000)
    with pytest.raises(ValueError):
        verify_token(token)
    monkeypatch.delenv("KINSIGHT_TOKEN_SECRET")
    with pytest.raises(RuntimeError):
        issue_token("person_a")


def test_demo_auth_disabled_by_default(monkeypatch):
    monkeypatch.delenv("KINSIGHT_DEMO_AUTH", raising=False)
    with pytest.raises(PermissionError):
        issue_token("person_a")
