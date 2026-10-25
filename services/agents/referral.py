"""Referral state machine (spec section 6). Pure: callers pass `now`; the scheduler lives outside."""
from __future__ import annotations

from datetime import datetime, timedelta

from pydantic import BaseModel

STATES = ["result_released", "counselling_requested", "counselling_done", "confirmatory_requested",
          "confirmatory_done", "specialist_referral_requested", "specialist_referral_done", "closed"]
NEXT = {s: STATES[i + 1] for i, s in enumerate(STATES[:-2])}  # linear path; closed reachable from anywhere


class ReferralError(ValueError):
    pass


class ReferralEvent(BaseModel):
    to_state: str
    at: datetime
    owner: str
    due: datetime | None
    evidence: str | None = None
    audit_ref: str | None = None  # id of the audit event the API writes for this change


class ReferralState(BaseModel):
    state: str = "result_released"
    overdue: bool = False
    overdue_since: datetime | None = None
    due: datetime | None = None
    owner: str = "user"
    events: list[ReferralEvent] = []


def advance(rs: ReferralState, to: str, now: datetime, rules: dict, evidence: str | None = None) -> ReferralState:
    """Allowed transitions only. 'closed' needs closure evidence or a recorded counsellor decision."""
    if to == "closed":
        if not evidence:
            raise ReferralError("closing needs evidence or a recorded counsellor decision")
        if rs.state == "closed":
            raise ReferralError("already closed")
    elif NEXT.get(rs.state) != to:
        raise ReferralError(f"illegal transition {rs.state} -> {to}")
    cfg = rules["referral"].get(to)
    owner = cfg["owner"] if cfg else "counsellor"
    due = now + timedelta(days=cfg["due_days"]) if cfg else None
    ev = ReferralEvent(to_state=to, at=now, owner=owner, due=due, evidence=evidence)
    # any transition clears overdue
    return ReferralState(state=to, overdue=False, due=due, owner=owner, events=[*rs.events, ev])


def mark_overdue(rs: ReferralState, now: datetime) -> ReferralState:
    """Set by the timer when the current step is past due; no effect once closed."""
    if rs.state != "closed" and rs.due and now > rs.due and not rs.overdue:
        return rs.model_copy(update={"overdue": True, "overdue_since": now})
    return rs
