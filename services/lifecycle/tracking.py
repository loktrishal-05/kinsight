"""OOB-6 eight-stage lab tracker, OOB-8 certificate countdown, P-18 re-engagement, referral stall (FR-019)."""
from __future__ import annotations

from dataclasses import dataclass, field

from . import cfg

DAY = 86400.0


@dataclass
class Sample:
    barcode: str
    stage: int = 1
    times: dict[int, float] = field(default_factory=dict)
    qc_failure: str | None = None


def advance(s: Sample, now: float) -> Sample:
    if s.qc_failure or s.stage >= len(cfg()["lab_stages"]):
        raise ValueError("Cannot advance")
    s.times[s.stage] = now
    s.stage += 1
    return s


def reject(s: Sample, reason: str, now: float) -> Sample:
    """Specimen rejected at QC: the tracker records it; the caller posts the refund (ledger.refund)."""
    s.qc_failure, s.times[s.stage] = reason, now
    return s


def stage_label(s: Sample) -> str:
    return cfg()["lab_stages"][s.stage - 1]


def certificate_status(issued_at: float, now: float) -> dict:
    """Genetic compatibility is permanent; only the serology certificate expires (PRD P-02, OOB-8)."""
    c = cfg()["certificate"]
    left = c["validity_days"] - int((now - issued_at) // DAY)
    due = [d for d in c["alert_days"] if left <= d]
    return {"days_left": max(left, 0), "expired": left <= 0, "alert_at": min(due) if due else None,
            "genetic_compatibility": "permanent"}


def reengagement_due(married_at: float, now: float, done: set[int]) -> int | None:
    for m in cfg()["reengage_months"]:
        if m not in done and now - married_at >= m * cfg()["reengage_days_per_month"] * DAY:
            return m
    return None


def referral_stalled(last_event_at: float, now: float) -> bool:
    return now - last_event_at > cfg()["referral_stall_hours"] * 3600
