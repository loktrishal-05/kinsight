"""FR-016 synthetic UTC slots from a fixed weekday template; no capacity claim."""
from datetime import datetime, timedelta, timezone

from . import cfg


def slots(now: float, sla_hours: int | None) -> list[int]:
    c = cfg()["booking"]
    if sla_hours is not None and (type(sla_hours) is not int or not 0 < sla_hours <= c["max_sla_hours"]):
        raise ValueError("Invalid SLA")
    start = datetime.fromtimestamp(now, timezone.utc)
    deadline = start
    if sla_hours is not None:
        deadline += timedelta(hours=sla_hours)
    else:
        remaining = c["target_business_days"]
        while remaining:
            deadline += timedelta(days=1)
            if deadline.weekday() in c["business_weekdays"]:
                remaining -= 1
    day = start.replace(hour=0, minute=0, second=0, microsecond=0)
    out = []
    while day <= deadline and len(out) < c["max_slots"]:
        for hour in c["weekday_hours"].get(day.weekday(), []):
            at = day + timedelta(hours=hour)
            if start < at <= deadline:
                out.append(int(at.timestamp()))
                if len(out) == c["max_slots"]:
                    break
        day += timedelta(days=1)
    return out
