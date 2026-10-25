"""Comprehension and equity analytics (P4-6). Works on any list of quiz result rows.

Row: {"language": str, "reading_level": str, "passed": bool}. Scripted answer profiles used in tests are test inputs,
never evidence about people; real evidence comes only from the Phase 6 mini-study.
"""
from __future__ import annotations

from collections import defaultdict


def summarise(rows: list[dict], target_gap_points: float = 10.0, min_group: int = 1) -> dict:
    groups: dict[tuple[str, str], list[bool]] = defaultdict(list)
    for r in rows:
        groups[(r["language"], r["reading_level"])].append(bool(r["passed"]))
    out = []
    for (lang, lvl), v in sorted(groups.items()):
        out.append({"language": lang, "reading_level": lvl, "n": len(v), "pass_rate": round(100 * sum(v) / len(v), 1),
                    "small_group": len(v) < min_group})
    usable = [g["pass_rate"] for g in out if not g["small_group"]]
    gap = round(max(usable) - min(usable), 1) if len(usable) > 1 else 0.0
    return {"groups": out, "gap_points": gap, "target_gap_points": target_gap_points,
            "gap_within_target": gap <= target_gap_points, "total": len(rows)}
