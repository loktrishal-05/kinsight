import gzip
import json
import math
import random

import pytest

from services.cohort.generate import child_geno, generate
from services.cohort.panel import ConfigError, load_cohort_config, load_panel, load_rules

PANEL, RULES, CFG = load_panel(), load_rules(), load_cohort_config()
DENY = ["name", "phone", "emirates_id", "passport", "dob", "address", "lat", "lon", "worker_id"]


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    d = tmp_path_factory.mktemp("c")
    m = generate(CFG, PANEL, RULES, d)
    return d, m


def rows(d, name):
    sub = d / "sim_truth" if name == "sim_truth" else d
    return [json.loads(line) for line in gzip.open(sub / f"{name}.jsonl.gz", "rt").read().splitlines()]


def test_reproducible(built, tmp_path):
    m2 = generate(CFG, PANEL, RULES, tmp_path)
    assert m2["sha256"] == built[1]["sha256"]


def test_realism(built):
    m = built[1]
    assert m["counts"]["couples"] == CFG.couples
    assert abs(m["achieved_consanguinity_share"] - CFG.consanguineous_share) < 0.03
    fc = CFG.first_cousin_share_of_all
    implied = fc / 16 + (CFG.consanguineous_share - fc) / 64  # rest are second cousins
    assert abs(m["mean_inbreeding_f"] - implied) / implied < 0.2


def test_missed_carrier_rate(built):
    d = built[0]
    truth = {(r["person_id"], r["condition_id"]): r["genotype"] for r in rows(d, "sim_truth")}
    inh = {c.id: c.inheritance for c in PANEL.conditions}
    n = miss = 0
    for r in rows(d, "screening_results"):
        g = truth[(r["person_id"], r["condition_id"])]
        carrier = (("1" in g) if inh[r["condition_id"]] == "XLR" else g.count("1") == 1)
        if carrier and r["status"] != "uncertain":
            n += 1; miss += r["status"] == "not_detected"
    p = 1 - 0.97
    assert n > 200 and abs(miss / n - p) < 4 * math.sqrt(p * (1 - p) / n) + 0.005


def test_mendelian_ar_quarter():
    rng, c = random.Random(1), PANEL.conditions[0]
    het = {c.id: (True, False) for c in PANEL.conditions}
    n, aff = 20000, 0
    for _ in range(n):
        g = child_geno(rng, PANEL, "male", het, het)[c.id]
        aff += all(g)
    assert abs(aff / n - 0.25) < 4 * math.sqrt(0.25 * 0.75 / n)


def test_privacy_deny_list_and_labelling(built):
    for name in ("persons", "relationships", "screening_results", "couples"):
        rs = rows(built[0], name)
        assert all(r["is_synthetic"] is True for r in rs) if name != "relationships" else True
        for k in rs[0]:
            assert not any(bad == k or k.startswith(bad + "_") for bad in DENY), k


def test_invalid_config_fails_clearly(tmp_path):
    bad = tmp_path / "panel.yaml"
    bad.write_text("panel_version: x\nconditions:\n  - id: C\n")
    with pytest.raises(ConfigError, match="panel.yaml"):
        load_panel(bad)
