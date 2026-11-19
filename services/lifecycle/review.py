"""Unified counsellor review queue (issue 40). Producers call `enqueue`; items that have their own revision-bound review
call `resolve` when that review approves. Rules live in configs/review_queue.yaml."""
from __future__ import annotations

import time
import uuid

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from services.cohort.panel import CONFIGS

from .store import ReviewItem

OPEN = ("pending", "held", "more_info")
DECISIONS = {"approve": "approved", "edit": "edited", "hold": "held", "more_info": "more_info"}


def rules() -> dict:
    return yaml.safe_load((CONFIGS / "review_queue.yaml").read_text(encoding="utf-8"))["review_queue"]


def enqueue(db: Session, kind: str, subject: str | None, ref: str, now: float | None = None) -> ReviewItem:
    """Exactly one open item per (kind, ref): repeating the trigger returns the item already waiting."""
    rule = rules()[kind]
    row = db.scalar(select(ReviewItem).where(ReviewItem.kind == kind, ReviewItem.ref == ref, ReviewItem.state.in_(OPEN)))
    if row is not None:
        return row
    now = time.time() if now is None else now
    row = ReviewItem(id=str(uuid.uuid4()), kind=kind, subject_id=subject, ref=ref, reason=rule["reason"], state="pending",
                     created_at=now, due_at=now + rule["sla_hours"] * 3600)
    db.add(row)
    db.flush()
    return row


def resolve(db: Session, kind: str, ref: str, state: str = "approved", reason: str = "dedicated_review") -> None:
    for row in db.scalars(select(ReviewItem).where(ReviewItem.kind == kind, ReviewItem.ref == ref, ReviewItem.state.in_(OPEN))):
        row.state, row.decided_reason, row.decided_at = state, reason, time.time()


def decide(db: Session, item_id: str, decision: str, reason: str) -> ReviewItem:
    row = db.get(ReviewItem, item_id, with_for_update=True)
    if row is None:
        raise LookupError(item_id)
    if decision not in DECISIONS:
        raise ValueError("unknown decision")
    if decision in ("approve", "edit") and rules()[row.kind]["dedicated"]:
        raise PermissionError("approve in the item's own review, which is bound to the exact revision")
    row.state, row.decided_reason, row.decided_at = DECISIONS[decision], reason, time.time()
    return row
