"""Scenario engine: properties, plus ten golden scenarios derived by hand from the published formulas."""
import pytest
from hypothesis import given
from hypothesis import strategies as st

from services.genetics.models import Condition
from services.genetics.scenarios import at_least_one, scenario


def cond(inheritance="AR", c=0.04, s=0.97):
    return Condition(id="COND_X", label_en="x", label_ar="x", inheritance=inheritance, carrier_frequency=c,
                     test_sensitivity=s, uncertain_rate=0.0, counselling_tier=1)


@given(st.floats(0, 1), st.integers(1, 12))
def test_probabilities_stay_in_range_and_grow_with_children(p, n):
    assert 0 <= at_least_one(p, n) <= 1
    assert at_least_one(p, n) <= at_least_one(p, n + 1) + 1e-12
    assert at_least_one(p, 1) == pytest.approx(p)


@given(st.sampled_from([0.0, 1 / 64, 1 / 32, 1 / 16, 1 / 8]), st.floats(0.001, 0.2), st.integers(1, 8))
def test_untested_partner_is_never_below_the_unrelated_case(phi, c, n):
    base = scenario(cond(c=c), "carrier", "untested", 0.0, n)["per_pregnancy"]
    got = scenario(cond(c=c), "carrier", "untested", phi, n)
    assert base - 1e-12 <= got["per_pregnancy"] <= 0.25 and 0 <= got["partner_carrier"] <= 1


def test_two_known_carriers_are_one_in_four_per_pregnancy():
    assert scenario(cond(), "carrier", "carrier", 0.0, 1)["per_pregnancy"] == 0.25


# (inheritance, a, b, phi, c, s, children) -> (per pregnancy, at least one), arithmetic written out independently
def prior(phi, c):
    return 2 * phi + (1 - 2 * phi) * c


def residual(c, s):
    return c * (1 - s) / (c * (1 - s) + (1 - c))


GOLDEN = [
    ("AR", "carrier", "carrier", 0.0, 0.04, 0.97, 1, 0.25),
    ("AR", "carrier", "carrier", 1 / 16, 0.04, 0.97, 3, 0.25),
    ("AR", "carrier", "untested", 0.0, 0.04, 0.97, 2, 0.25 * 0.04),
    ("AR", "carrier", "untested", 1 / 16, 0.04, 0.97, 2, 0.25 * prior(1 / 16, 0.04)),
    ("AR", "carrier", "untested", 1 / 8, 0.02, 0.97, 4, 0.25 * prior(1 / 8, 0.02)),
    ("AR", "carrier", "not_detected", 0.0, 0.04, 0.97, 2, 0.25 * (lambda pr: pr * 0.03 / (pr * 0.03 + 1 - pr))(0.04)),
    ("AR", "carrier", "not_detected", 1 / 16, 0.03, 0.97, 1, 0.25 * (lambda pr: pr * 0.03 / (pr * 0.03 + 1 - pr))(prior(1 / 16, 0.03))),
    ("AR", "not_detected", "not_detected", 0.0, 0.04, 0.97, 5, 0.25 * residual(0.04, 0.97) ** 2),
    ("XLR", "carrier", "not_detected", 0.0, 0.01, 0.97, 2, 0.5),
    ("XLR", "not_detected", "carrier", 0.0, 0.01, 0.97, 2, 0.0),
]


@pytest.mark.parametrize("inh,a,b,phi,c,s,n,want", GOLDEN)
def test_golden(inh, a, b, phi, c, s, n, want):
    got = scenario(cond(inh, c, s), a, b, phi, n)
    assert got["per_pregnancy"] == pytest.approx(want)
    assert got["at_least_one"] == pytest.approx(1 - (1 - want) ** n)


def test_unsupported_combinations_are_refused():
    for args in [("not_detected", "untested"), ("untested", "carrier")]:
        with pytest.raises(ValueError):
            scenario(cond(), *args, 0.0, 1)
    with pytest.raises(ValueError):
        scenario(cond("XLR"), "carrier", "untested", 0.0, 1)


def test_web_mock_fixture_matches_the_engine():
    import json
    from pathlib import Path

    from scripts.export_scenarios import build

    web = json.loads((Path(__file__).parents[2] / "web/lib/fixtures/scenarios.json").read_text(encoding="utf-8"))
    assert web == json.loads(json.dumps(build())), "run: python scripts/export_scenarios.py"
