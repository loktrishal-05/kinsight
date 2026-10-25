"""Capacity and time-to-care simulator (spec section 10, P4-7). Illustrative only; seeded and reproducible."""
from __future__ import annotations

import heapq
import math
import random
import statistics

POLICIES = ("fcfs", "tier_priority", "tier_priority_auto_tier1")
LABEL = "Illustrative simulation on synthetic assumptions; not a forecast."


def _poisson(rng: random.Random, lam: float) -> int:
    limit, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= limit:
            return k
        k += 1


def simulate(policy: str, *, seed: int, weeks: int, arrivals_per_week: float, tier_mix: dict[int, float],
             counsellors_slots_per_week: int, service_window_days: int) -> dict:
    """Discrete-event run: weekly Poisson arrivals by tier, counsellor slots spread evenly across the week."""
    if policy not in POLICIES:
        raise ValueError(policy)
    rng = random.Random(seed)
    tiers, weights = zip(*sorted(tier_mix.items()))
    cases = []  # (arrival_day, tier)
    for w in range(weeks):
        for _ in range(_poisson(rng, arrivals_per_week)):
            cases.append((w * 7 + rng.random() * 7, rng.choices(tiers, weights)[0]))
    cases.sort()
    waits: dict[int, list[float]] = {t: [] for t in tiers}
    by_week: dict[int, list[float]] = {w: [] for w in range(weeks)}  # waits grouped by arrival week
    queue: list[tuple] = []
    i, slot_gap = 0, 7 / counsellors_slots_per_week
    t = 0.0
    horizon = weeks * 7
    while t < horizon * 4 and (i < len(cases) or queue):
        while i < len(cases) and cases[i][0] <= t:
            day, tier = cases[i]
            i += 1
            if policy == "tier_priority_auto_tier1" and tier == 1:
                waits[1].append(0.0)  # handled automatically, uses no counsellor time
                by_week[min(int(day // 7), weeks - 1)].append(0.0)
                continue
            prio = day if policy == "fcfs" else (-tier, day)
            heapq.heappush(queue, (prio, day, tier))
        if queue:
            _, day, tier = heapq.heappop(queue)
            waits[tier].append(t - day)
            by_week[min(int(day // 7), weeks - 1)].append(t - day)
        t += slot_gap
    allw = [w for ws in waits.values() for w in ws]
    t3 = waits.get(3, [])
    return {"policy": policy, "n": len(allw), "median_days": round(statistics.median(allw), 1),
            "p95_days": round(sorted(allw)[int(0.95 * (len(allw) - 1))], 1),
            "tier3_within_window": round(sum(w <= service_window_days for w in t3) / max(len(t3), 1), 3),
            "weekly": [{"week": w, "served": len(v), "median_wait": round(statistics.median(v), 1) if v else None}
                       for w, v in by_week.items()],
            "label": LABEL}


def compare(cfg: dict) -> dict:
    """cfg from configs/capacity.yaml; every assumption is echoed so the screen can show it."""
    runs = [simulate(p, seed=cfg["seed"], weeks=cfg["weeks"], arrivals_per_week=cfg["arrivals_per_week"],
                     tier_mix={int(k): v for k, v in cfg["tier_mix"].items()},
                     counsellors_slots_per_week=cfg["counsellor_slots_per_week"],
                     service_window_days=cfg["service_window_days"]) for p in POLICIES]
    return {"assumptions": cfg, "runs": runs, "label": LABEL}
