"""Analyse the volunteer comprehension study (docs/study/protocol.md).

Input: the CSV exported from /study/results (one row per participant, no names). Output: a descriptive Markdown report with
n and pass rate per language x reading level, the largest gap against the 10-point target, the questions missed most often,
and the mean clarity rating. Descriptive only, as the protocol requires.

    python scripts/analyse_study.py kinsight-study-2026-11-01.csv [--out docs/study/results.md]
"""
from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from services.analytics.comprehension import summarise  # noqa: E402


def load(path: Path) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    for r in rows:
        r["passed"] = r["passed"].strip().lower() == "true"
        r["clarity"] = int(r["clarity"]) if r.get("clarity", "").strip() else None
        r["missed"] = r.get("missed", "").split()
    return rows


def report(rows: list[dict]) -> str:
    s = summarise(rows)
    clarity: dict[tuple[str, str], list[int]] = defaultdict(list)
    for r in rows:
        if r["clarity"] is not None:
            clarity[(r["language"], r["reading_level"])].append(r["clarity"])
    missed = Counter(q for r in rows for q in r["missed"])
    out = ["# Volunteer comprehension study: results", "",
           f"Participants: **{s['total']}**. A pass means all five answers right on the first try (the app's rule).", "",
           "| Language | Reading level | n | Pass rate | Mean clarity (1-5) |", "|---|---|---:|---:|---:|"]
    for g in s["groups"]:
        c = clarity.get((g["language"], g["reading_level"]))
        out.append(f"| {g['language']} | {g['reading_level']} | {g['n']} | {g['pass_rate']}% | {round(sum(c) / len(c), 1) if c else '-'} |")
    out += ["", f"Largest gap between groups: **{s['gap_points']} points** (target {s['target_gap_points']} or less: "
                f"{'met' if s['gap_within_target'] else 'not met'})." if len(s["groups"]) > 1 else "Only one group so far; no gap to report."]
    if missed:
        out += ["", "Questions missed most often:", ""] + [f"- `{q}`: {n}" for q, n in missed.most_common()]
    out += ["", "Descriptive only. Groups are small convenience samples of fictional cases; no claim is made beyond these numbers.", ""]
    return "\n".join(out)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("csv", type=Path)
    ap.add_argument("--out", type=Path)
    a = ap.parse_args()
    text = report(load(a.csv))
    if a.out:
        a.out.write_text(text, encoding="utf-8")
        print(f"wrote {a.out}")
    else:
        print(text)


if __name__ == "__main__":
    main()
