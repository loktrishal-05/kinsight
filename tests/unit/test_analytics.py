import yaml

from services.analytics.capacity import POLICIES, compare, simulate
from services.analytics.comprehension import summarise
from services.cohort.panel import CONFIGS

CFG = yaml.safe_load((CONFIGS / "capacity.yaml").read_text())


def test_capacity_reproducible_and_labelled():
    a, b = compare(CFG), compare(CFG)
    assert a == b and a["label"].startswith("Illustrative") and len(a["runs"]) == 3


def test_triage_helps_tier3():
    r = {x["policy"]: x for x in compare(CFG)["runs"]}
    assert r["tier_priority"]["tier3_within_window"] >= r["fcfs"]["tier3_within_window"]
    assert r["tier_priority_auto_tier1"]["median_days"] <= r["fcfs"]["median_days"]


def test_unknown_policy_rejected():
    import pytest
    with pytest.raises(ValueError):
        simulate("x", seed=1, weeks=1, arrivals_per_week=1, tier_mix={1: 1}, counsellors_slots_per_week=1,
                 service_window_days=7)
    assert set(POLICIES) == {"fcfs", "tier_priority", "tier_priority_auto_tier1"}


def test_comprehension_gap():
    rows = [{"language": "en", "reading_level": "standard", "passed": True}] * 9 + \
           [{"language": "en", "reading_level": "standard", "passed": False}] + \
           [{"language": "ar", "reading_level": "basic", "passed": True}] * 5 + \
           [{"language": "ar", "reading_level": "basic", "passed": False}] * 5  # test inputs, not evidence
    s = summarise(rows)
    assert s["gap_points"] == 40.0 and not s["gap_within_target"] and s["groups"][0]["n"] == 10
