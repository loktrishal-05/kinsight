"""Couple assessment (spec section 5). Owns every number a person sees. Pure."""
from __future__ import annotations

import hashlib
import json

from .kinship import kinship
from .models import Condition, CoupleAssessment, Finding, Panel
from .pedigree import Pedigree
from .rules import Rules

ENGINE_VERSION = "0.1.0"


def config_hash(panel: Panel, rules: Rules) -> str:
    blob = json.dumps([panel.model_dump(), rules.model_dump()], sort_keys=True)
    return hashlib.sha256(blob.encode()).hexdigest()[:16]


def _residual(c: float, s: float) -> float:
    return c * (1 - s) / (c * (1 - s) + (1 - c))


def _ar(cond: Condition, sa: str, sb: str, phi: float) -> tuple[str, dict, float | None, list[str]]:
    c, s = cond.carrier_frequency, cond.test_sensitivity
    r = 2 * phi
    inputs = {"c": c, "s": s, "phi": phi, "r": r}
    notes = ["related_partners"] if phi > 0 else []
    if "uncertain" in (sa, sb):
        return "ar_needs_review", inputs, None, notes + ["uncertain_result"]
    if sa == sb == "carrier":
        inputs.update(carrier_child=0.5, unaffected_noncarrier_child=0.25)
        return "ar_both_carrier", inputs, 0.25, notes
    if "carrier" in (sa, sb):
        prior = r + (1 - r) * c
        post = prior * (1 - s) / (prior * (1 - s) + (1 - prior))
        inputs.update(prior_other=prior, post_other=post)
        return "ar_one_carrier_residual", inputs, 0.25 * post, notes
    p = _residual(c, s)
    inputs.update(p_x=p)
    if phi > 0:
        notes.append("independence_assumed")  # relatedness can raise the true figure
    return "ar_both_not_detected", inputs, 0.25 * p * p, notes


def _xlr(cond: Condition, sa: str, sb: str, a_is_female: bool) -> tuple[str, dict, float | None, list[str]]:
    inputs = {"c": cond.carrier_frequency, "s": cond.test_sensitivity}
    if "uncertain" in (sa, sb):
        return "xlr_needs_review", inputs, None, ["uncertain_result"]
    mother = sa if a_is_female else sb
    father = sb if a_is_female else sa
    if mother == "carrier":
        inputs.update(son_affected=0.5, daughter_carrier=0.5)
        return "xlr_mother_carrier", inputs, 0.5, ["x_linked"]
    if father == "carrier":
        inputs.update(son_affected=0.0, daughter_carrier=1.0)
        return "xlr_father_carrier", inputs, 0.0, ["x_linked"]
    return "xlr_none", inputs, 0.0, ["x_linked"]


def assess_couple(ped: Pedigree, a: str, b: str, results: dict[str, dict[str, str]],
                  panel: Panel, rules: Rules, use_uncertain: bool = False) -> CoupleAssessment:
    """results: person -> {condition_id: status}. Conditions missing for either partner are skipped."""
    a, b = sorted((a, b))
    phi = kinship(ped, a, b, use_uncertain)
    related = phi > rules.related_phi_min
    findings: list[Finding] = []
    tier = 1
    for cond in panel.conditions:
        sa, sb = results.get(a, {}).get(cond.id), results.get(b, {}).get(cond.id)
        if sa is None or sb is None:
            continue
        if cond.inheritance == "AR":
            fid, inputs, risk, notes = _ar(cond, sa, sb, phi)
        else:
            fid, inputs, risk, notes = _xlr(cond, sa, sb, ped.sex.get(a) == "female")
        if fid == "xlr_none" or (fid == "ar_both_not_detected" and not (related or rules.emit_residual_unrelated)):
            continue
        findings.append(Finding(condition_id=cond.id, inheritance=cond.inheritance, status_a=sa,
                                status_b=sb, formula_id=fid, inputs=inputs, risk_affected=risk,
                                note_codes=notes))
        tier = max(tier, _tier(cond, sa, sb, related, rules))
    return CoupleAssessment(couple_id=f"{a}:{b}", inbreeding_f=phi, kinship_phi=phi, findings=findings,
                            tier=tier, engine_version=ENGINE_VERSION, panel_version=panel.panel_version,
                            config_hash=config_hash(panel, rules))


def _tier(cond: Condition, sa: str, sb: str, related: bool, rules: Rules) -> int:
    t3, t2 = rules.tier3, rules.tier2
    carriers = [x for x in (sa, sb) if x == "carrier"]
    if t3.both_carry_same and len(carriers) == 2:
        return 3
    if "uncertain" in (sa, sb) and cond.counselling_tier in t3.uncertain_on_condition_tiers:
        return 3
    if carriers and cond.inheritance == "XLR" and t3.xlr_carrier:
        return 3
    if carriers and cond.counselling_tier in t3.carrier_of_condition_tiers:
        return 3
    if len(carriers) == 1 and related and t3.carrier_with_related_partner and "uncertain" not in (sa, sb):
        return 3
    if len(carriers) == 1 and not related and cond.counselling_tier in t2.one_carrier_unrelated_condition_tiers:
        return 2
    return 1
