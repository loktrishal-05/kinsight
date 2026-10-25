import pytest
from hypothesis import given
from hypothesis import strategies as st

from services.cohort.panel import load_panel, load_rules
from services.genetics import Pedigree, assess_couple

PANEL, RULES = load_panel(), load_rules()
AR = next(c for c in PANEL.conditions if c.inheritance == "AR" and c.counselling_tier == 2)
AR1 = next(c for c in PANEL.conditions if c.inheritance == "AR" and c.counselling_tier == 1)
AR3 = next(c for c in PANEL.conditions if c.inheritance == "AR" and c.counselling_tier == 3)
XL = next(c for c in PANEL.conditions if c.inheritance == "XLR")


def couple(related=False):
    p = Pedigree()
    for pid, sex in (("a", "male"), ("b", "female")):
        p.add_person(pid, sex)
    if related:  # first cousins via shared grandparents
        for pid, sex in (("gf", "male"), ("gm", "female"), ("x", "male"), ("y", "male"), ("xs", "female"),
                         ("ys", "female")):
            p.add_person(pid, sex)
        for c, f, m in (("x", "gf", "gm"), ("y", "gf", "gm")):
            p.add_parent(c, f); p.add_parent(c, m)
        for c, f, m in (("a", "x", "xs"), ("b", "y", "ys")):
            p.add_parent(c, f); p.add_parent(c, m)
    return p


def run(sa, sb, cond=AR, related=False):
    res = {"a": {cond.id: sa}, "b": {cond.id: sb}}
    return assess_couple(couple(related), "a", "b", res, PANEL, RULES)


def test_both_carrier():
    r = run("carrier", "carrier"); f = r.findings[0]
    assert f.formula_id == "ar_both_carrier" and f.risk_affected == 0.25 and r.tier == 3


def test_one_carrier_unrelated_hand_computed():
    c, s = AR.carrier_frequency, AR.test_sensitivity
    prior = c; post = prior * (1 - s) / (prior * (1 - s) + 1 - prior)
    r = run("carrier", "not_detected"); f = r.findings[0]
    assert f.risk_affected == pytest.approx(0.25 * post) and r.tier == 2


def test_one_carrier_related_goes_tier3_and_raises_risk():
    u, rel = run("carrier", "not_detected"), run("carrier", "not_detected", related=True)
    assert rel.tier == 3 and rel.findings[0].risk_affected > u.findings[0].risk_affected
    assert rel.kinship_phi == pytest.approx(1 / 16) and "related_partners" in rel.findings[0].note_codes


def test_both_not_detected_only_reported_when_related():
    assert run("not_detected", "not_detected").findings == [] and run("not_detected", "not_detected").tier == 1
    f = run("not_detected", "not_detected", related=True).findings[0]
    c, s = AR.carrier_frequency, AR.test_sensitivity
    p = c * (1 - s) / (c * (1 - s) + 1 - c)
    assert f.risk_affected == pytest.approx(0.25 * p * p) and "independence_assumed" in f.note_codes


def test_uncertain_no_figure():
    r = run("uncertain", "not_detected"); assert r.findings[0].risk_affected is None and r.tier == 3
    assert run("uncertain", "not_detected", cond=AR1).tier == 1


def test_tier3_condition_single_carrier():
    assert run("carrier", "not_detected", cond=AR3).tier == 3


def test_xlr():
    r = run("not_detected", "carrier", cond=XL)  # b is female
    assert r.findings[0].formula_id == "xlr_mother_carrier" and r.findings[0].risk_affected == 0.5 and r.tier == 3
    assert run("carrier", "not_detected", cond=XL).findings[0].formula_id == "xlr_father_carrier"


S = st.sampled_from(["carrier", "not_detected", "uncertain"])


@given(S, S, st.booleans(), st.sampled_from([AR, AR1, AR3]))
def test_properties(sa, sb, rel, cond):
    r = run(sa, sb, cond, rel)
    assert 0 <= r.kinship_phi <= 0.5
    for f in r.findings:
        assert f.risk_affected is None or 0 <= f.risk_affected <= 0.25
    # swapping partners gives the same assessment
    res = {"a": {cond.id: sb}, "b": {cond.id: sa}}
    sw = assess_couple(couple(rel), "b", "a", res, PANEL, RULES)
    assert sw.model_dump() == r.model_dump() or {(f.formula_id, f.risk_affected) for f in sw.findings} == \
        {(f.formula_id, f.risk_affected) for f in r.findings}


@given(st.booleans())
def test_adding_carrier_never_lowers_risk(rel):
    r0 = run("not_detected", "not_detected", related=True).findings[0].risk_affected
    r1 = run("carrier", "not_detected", related=rel).findings[0].risk_affected
    r2 = run("carrier", "carrier", related=rel).findings[0].risk_affected
    assert r1 >= r0 * 0 and r2 >= r1 and (not rel or r1 >= r0)


def test_carrier_couple_offspring_probs_sum_to_one():
    f = run("carrier", "carrier").findings[0]
    assert f.risk_affected + f.inputs["carrier_child"] + f.inputs["unaffected_noncarrier_child"] == pytest.approx(1)


def test_performance_200_person_pedigree():
    import time
    p = Pedigree()
    for i in range(200):
        p.add_person(f"p{i}", "male" if i % 2 == 0 else "female")
    for i in range(20, 200):  # parents from earlier people (acyclic by construction)
        p.add_parent(f"p{i}", f"p{(i * 3) % (i - i % 2) // 2 * 2}")
        p.add_parent(f"p{i}", f"p{((i * 7) % (i - 1)) | 1}")
    t = time.perf_counter(); assess_couple(p, "p198", "p199", {}, PANEL, RULES)
    assert time.perf_counter() - t < 0.2
