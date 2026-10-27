"""Evaluation harness (P3-7): 40 golden couples x 2 languages x 2 reading levels, code evaluators only.

Gates (spec section 7): numeric fidelity 100%, block conformity 100%, banned phrases 0, readability within band.
LLM-judge groundedness and the 10% human review sample run on a schedule, not in CI.
"""
from __future__ import annotations

import itertools
import re

from services.cohort.panel import load_panel, load_rules
from services.genetics import CoupleAssessment, Pedigree, assess_couple

from .render import fmt_percent, load_templates, render_draft, select_blocks
from .verify import load_wording, verify


def _couple(related: bool) -> Pedigree:
    p = Pedigree()
    for pid, sex in (("a", "male"), ("b", "female")):
        p.add_person(pid, sex)
    if related:  # first cousins through shared grandparents
        for pid, sex in (("gf", "male"), ("gm", "female"), ("x", "male"), ("y", "male"), ("xs", "female"), ("ys", "female")):
            p.add_person(pid, sex)
        for c, f, m in (("x", "gf", "gm"), ("y", "gf", "gm"), ("a", "x", "xs"), ("b", "y", "ys")):
            p.add_parent(c, f)
            p.add_parent(c, m)
    return p


def golden_couples(n: int = 40) -> list[CoupleAssessment]:
    panel, rules = load_panel(), load_rules()
    tiers = {t: next(c for c in panel.conditions if c.inheritance == "AR" and c.counselling_tier == t) for t in (1, 2, 3)}
    xl = next(c for c in panel.conditions if c.inheritance == "XLR")
    grid = itertools.product([tiers[1], tiers[2], tiers[3], xl],
                             [("carrier", "carrier"), ("carrier", "not_detected"), ("not_detected", "not_detected"),
                              ("uncertain", "carrier"), ("uncertain", "not_detected")], [False, True])
    out = []
    for cond, (sa, sb), rel in itertools.islice(grid, n):
        out.append(assess_couple(_couple(rel), "a", "b", {"a": {cond.id: sa}, "b": {cond.id: sb}}, panel, rules))
    return out


def run_eval(couples: list[CoupleAssessment] | None = None) -> dict:
    panel, tpl, wording = load_panel(), load_templates(), load_wording()
    couples = couples if couples is not None else golden_couples()
    total = ok_all = fidelity_ok = banned = 0
    errors: list[str] = []
    for a, (lang, level) in itertools.product(couples, itertools.product(sorted({lg for lg, _ in tpl}), ("basic", "standard"))):
        d = select_blocks(a, lang, level, tpl)
        rep = verify(d, a, panel, tpl, wording)
        total += 1
        ok_all += rep.ok
        errors += rep.errors
        text = " ".join(rb.text for rb in render_draft(d, a, panel, tpl))
        want = {fmt_percent(f.risk_affected, lang) for f in a.findings if f.risk_affected is not None}
        # the language's own "less than 1%" phrase counts as one number, not as a stray "1%"
        got = set(re.findall(re.escape(fmt_percent(0.001, lang)) + r"|\d+%", text))
        fidelity_ok += got <= want | {fmt_percent(f.inputs[k], lang) for f in a.findings for k in f.inputs if k == "daughter_carrier"}
        banned += sum(p in text.lower() for p in wording["banned"][lang])
    return {"drafts": total, "verified": ok_all, "numeric_fidelity": fidelity_ok / total,
            "block_conformity": ok_all / total, "banned_phrases": banned, "errors": errors[:5]}
