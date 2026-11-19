"""No response model may expose a risk figure that is not an educational-estimate envelope."""

import re

from services.api.main import create_app
from services.api.schemas import Estimate, estimate

RISKY = re.compile(r"risk|chance|probab|likelihood|pct|percent|frequency", re.I)


def _refs(prop: dict):
    yield prop.get("$ref", "")
    for key in ("anyOf", "oneOf", "allOf"):
        for part in prop.get(key, []):
            yield from _refs(part)
    if "items" in prop:
        yield from _refs(prop["items"])


def test_every_risk_property_in_the_api_is_an_estimate(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    schemas = create_app("sqlite://").openapi()["components"]["schemas"]
    assert "Estimate" in schemas
    seen = 0
    for name, schema in schemas.items():
        for prop, spec in schema.get("properties", {}).items():
            if RISKY.search(prop):
                seen += 1
                assert any(r.endswith("/Estimate") for r in _refs(spec)), f"{name}.{prop} is not an Estimate"
    assert seen >= 2  # the couple finding and the triage figure


def test_estimate_envelope_is_labelled_and_bounded():
    assert estimate(0.25, "ar_both_carrier") == {
        "value": 0.25, "kind": "educational_estimate", "basis": "ar_both_carrier", "method_url": "/methods"}
    assert estimate(None, "ar_both_carrier")["value"] is None
    for bad in (1.5, -0.1):
        try:
            Estimate(value=bad, basis="x")
        except ValueError:
            continue
        raise AssertionError(bad)
