"""What-if family-planning scenarios (issue 37). Pure: no I/O, no new risk maths.

Every per-pregnancy figure comes from the same formulas as the couple assessment (`assess._ar` / `assess._xlr`).
A partner who has not been tested is the one-carrier formula with sensitivity 0, so the carrier chance is
r + (1 - r)c with r = 2 phi, exactly the engine's prior. The only arithmetic added here is repetition over N pregnancies."""
from __future__ import annotations

from typing import Any

from .assess import _ar, _xlr
from .models import Condition

KNOWN = ("carrier", "not_detected")


def at_least_one(p: float, n: int) -> float:
    """Chance that at least one of n independent pregnancies is affected."""
    if not 0 <= p <= 1 or n < 1:
        raise ValueError("p must be in [0, 1] and n at least 1")
    return 1 - (1 - p) ** n


def scenario(cond: Condition, status_a: str, status_b: str, phi: float, children: int) -> dict[str, Any]:
    """status_a is a tested result; status_b is a tested result or 'untested'. XLR assumes partner A is the mother."""
    if status_a not in KNOWN or status_b not in (*KNOWN, "untested"):
        raise ValueError("unsupported statuses")
    partner = None
    if cond.inheritance == "XLR":
        if status_b == "untested":
            raise ValueError("untested partner is only modelled for autosomal recessive conditions")
        fid, inputs, risk, _ = _xlr(cond, status_a, status_b, True)
    elif status_b == "untested":
        if status_a != "carrier":
            raise ValueError("an untested partner needs a partner who is known to carry the change")
        fid, inputs, risk, _ = _ar(cond.model_copy(update={"test_sensitivity": 0.0}), "carrier", "not_detected", phi)
        fid, partner = "ar_one_partner_untested", inputs["prior_other"]
    else:
        fid, inputs, risk, _ = _ar(cond, status_a, status_b, phi)
        partner = inputs.get("post_other")
    if risk is None:  # only uncertain results give no figure, and those are refused above
        raise ValueError("no figure for these statuses")
    return {"formula_id": fid, "per_pregnancy": risk, "at_least_one": at_least_one(risk, children), "partner_carrier": partner}
