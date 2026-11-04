"""P-09 calendar arithmetic only, measured in days since LMP."""
from . import cfg


def evaluate(days_since_lmp: int) -> dict:
    c = cfg()["gestation"]
    if type(days_since_lmp) is not int or not 0 <= days_since_lmp <= c["max_days"]:
        raise ValueError("Invalid day count")
    n = days_since_lmp
    return {"days": n, "weeks": n // c["days_per_week"],
            "in_cvs_window": c["cvs_start_days"] <= n <= c["cvs_end_days"],
            "days_to_day_120": max(0, c["day_120"] - n), "past_day_120": n > c["day_120"]}
