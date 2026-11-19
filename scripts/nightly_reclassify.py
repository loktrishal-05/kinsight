"""Nightly ClinVar re-check (issue 33). For every variant on file in an open case, compare the class on the report with
ClinVar today; each change across the 4/5 line becomes one counsellor review item (configs/review_queue.yaml).

    python scripts/nightly_reclassify.py                          # live ClinVar, DATABASE_URL
    python scripts/nightly_reclassify.py --fixture tests/fixtures/refdata/clinvar_7105.json   # recorded, for CI
"""
import argparse
import io
import json
import os
from pathlib import Path

import yaml
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from services.lifecycle import clinvar, review, safety
from services.lifecycle.store import LifecycleBase

ROOT = Path(__file__).resolve().parents[1]


def run(db: Session, opener=None) -> list[dict]:
    tracked = yaml.safe_load((ROOT / "configs/tracked_variants.yaml").read_text(encoding="utf-8"))["variants"]
    archived = {v["clinvar_id"]: v["class_on_report"] for v in tracked}
    live = clinvar.fetch(list(archived), **({"opener": opener} if opener else {}))
    feed = {k: v["acmg_class"] for k, v in live.items() if v["acmg_class"]}
    alerts = safety.reclassification(archived, feed)
    for alert in alerts:
        review.enqueue(db, "reclassification", None, f"variant:{alert['variant']}")
    db.commit()
    return alerts


def main() -> None:
    args = argparse.ArgumentParser()
    args.add_argument("--fixture", help="recorded ClinVar esummary JSON instead of the live service")
    a = args.parse_args()
    engine = create_engine(os.environ.get("DATABASE_URL", "sqlite:///kinsight-consent.db"))
    LifecycleBase.metadata.create_all(engine)
    opener = None
    if a.fixture:
        body = Path(a.fixture).read_bytes()
        opener = lambda *_a, **_k: io.BytesIO(body)  # noqa: E731
    with Session(engine) as db:
        alerts = run(db, opener)
    print(json.dumps({"checked": "clinvar", "alerts": alerts}))


if __name__ == "__main__":
    main()
