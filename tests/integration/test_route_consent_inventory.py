"""Require explicit classification for every API route, including opt-in routes."""

import ast
import inspect
from textwrap import dedent

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlalchemy import select

from services.api.main import create_app
from services.consent.audit import verify_chain
from services.consent.models import AuditEvent
from services.consent.policy import decide
from services.consent.sharing import log_change
from tests.integration.test_lab_sandbox import auth, init

PUBLIC = {
    ("GET", "/openapi.json"),
    ("GET", "/docs"),
    ("GET", "/docs/oauth2-redirect"),
    ("GET", "/redoc"),
    ("GET", "/api/health"),
    ("GET", "/api/governance/data-sources"),
    ("POST", "/api/auth/persona"),
}
SIGNED_TRANSPORT = {
    ("POST", "/api/integrations/lab/events"),
    ("POST", "/api/integrations/lab/hl7"),
}
# These role-limited operations use caller input, public references or purpose-built
# anonymized dispatch data. Each operation still writes an audit event.
ROLE_ONLY = {
    ("GET", "/api/lifecycle/booking/slots"),
    ("GET", "/api/lifecycle/reengagement"),
    ("GET", "/api/lifecycle/scenario"),
    ("POST", "/api/lifecycle/cascade/outcome"),
    *(("POST", "/api/lifecycle/" + operation) for operation in (
        "measures/mmic", "measures/gcos", "nasab", "gestation", "triage", "whisper",
        "whisper/dispatch", "checkin", "reclassify", "tamm", "break-glass", "cascade",
        "cascade/redeem", "reclassify/live", "frequency",
    )),
}


def calls(function, target, visited=None):
    if function is target:
        return True
    visited = set() if visited is None else visited
    if not inspect.isfunction(function) or not function.__module__.startswith("services.api") or function in visited:
        return False
    visited.add(function)
    closure = inspect.getclosurevars(function)
    names = closure.globals | closure.nonlocals
    tree = ast.parse(dedent(inspect.getsource(function)))
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        callee = node.func
        if isinstance(callee, ast.Name) and calls(names.get(callee.id), target, visited):
            return True
        if isinstance(callee, ast.Attribute) and isinstance(callee.value, ast.Name):
            if calls(getattr(names.get(callee.value.id), callee.attr, None), target, visited):
                return True
    return False


def dependencies(dependant):
    for child in dependant.dependencies:
        yield child.call
        yield from dependencies(child)


def unguarded(app):
    missing = []
    for route in app.routes:
        for method in sorted(route.methods or ()):
            if method == "HEAD" and "GET" in route.methods:
                continue
            key = method, route.path
            if key in PUBLIC or key in SIGNED_TRANSPORT:
                continue
            authenticated = isinstance(route, APIRoute) and any(
                getattr(dependency, "__qualname__", "") == "create_app.<locals>.authenticate"
                for dependency in dependencies(route.dependant)
            )
            policy = log_change if key in ROLE_ONLY else decide
            if not authenticated or not calls(route.endpoint, policy):
                missing.append(key)
    return missing


@pytest.mark.parametrize("enable_integrations", [False, True])
def test_every_route_has_an_audited_access_policy(monkeypatch, enable_integrations):
    monkeypatch.setenv("KINSIGHT_DEMO", "1" if enable_integrations else "0")
    monkeypatch.setenv("KINSIGHT_LAB_SANDBOX", "1" if enable_integrations else "0")
    monkeypatch.setenv("KINSIGHT_LAB_SIGNING_SECRET", "synthetic-route-inventory-only")
    monkeypatch.setenv("KINSIGHT_FHIR_SANDBOX_URL", "http://127.0.0.1:8088/fhir")
    monkeypatch.setenv("KINSIGHT_FHIR_REFERRAL_URL", "http://127.0.0.1:8088/fhir")
    app = create_app("sqlite://")
    assert unguarded(app) == []

    @app.get("/api/unreviewed-test-route")
    def unreviewed():
        return {}

    assert unguarded(app) == [("GET", "/api/unreviewed-test-route")]


def test_legacy_tracker_audits_the_owner_read(monkeypatch):
    init(monkeypatch, "0")
    app = create_app("sqlite://")
    with TestClient(app) as client:
        path = "/api/lifecycle/tracker"
        assert client.get(path).status_code == 401
        assert client.get(path, headers=auth(client, "counsellor")).status_code == 403
        assert client.get(path, headers=auth(client, "person_a")).status_code == 200
        with app.state.sessions() as db:
            events = db.scalars(select(AuditEvent).where(AuditEvent.resource_type == "lifecycle")).all()
            assert [(event.decision, event.reason_code) for event in events] == [("allow", "owner")]
            assert verify_chain(db)
