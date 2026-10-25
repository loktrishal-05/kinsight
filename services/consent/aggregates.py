"""Fixed disjoint count histograms only: no filters, totals, or overlapping releases."""

import hashlib
import json
import math
import secrets

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .models import AggregateRelease, PrivacyBudget
from .settings import PrivacySettings


def suppress(counts: dict[str, int], min_cell: int) -> dict[str, int | None]:
    if min_cell < 2 or not counts or any(type(n) is not int or n < 0 for n in counts.values()):
        raise ValueError("Nonnegative disjoint counts required")
    # shortcut: suppress the whole partition on a small cell, upgrade only with joint-query proofs.
    if any(n < min_cell for n in counts.values()):
        return dict.fromkeys(counts)
    return dict(counts)


def laplace(epsilon: float) -> float:
    # Open interval avoids log(0); cryptographic randomness is never seeded by the caller.
    u = (secrets.randbits(52) + 0.5) / (2**52) - 0.5
    return -math.copysign(1.0, u) * math.log1p(-2 * abs(u)) / epsilon


def release(db: Session, dataset_id: str, counts: dict[str, int], config: PrivacySettings) -> dict:
    """dataset_id is a server-owned immutable partition, never a client query.

    All releases share one durable budget. Callers commit before returning data.
    Threshold suppression itself is not a formal differential-privacy guarantee.
    """
    cells = suppress(counts, config.min_cell)
    fingerprint = hashlib.sha256(json.dumps(counts, sort_keys=True).encode()).hexdigest()
    previous = db.scalar(select(AggregateRelease).where(AggregateRelease.dataset_id == dataset_id))
    budget = db.get(PrivacyBudget, "global")
    if budget is None:
        budget = PrivacyBudget(id="global", spent=0, limit=config.epsilon_total)
        db.add(budget)
        db.flush()
    if previous:
        if previous.fingerprint != fingerprint:
            raise ValueError("A released partition is immutable")
        return {
            "cells": previous.cells,
            "budget_remaining": budget.limit - budget.spent,
            "is_synthetic": True,
        }
    epsilon = config.epsilon_per_release
    charged = db.execute(
        update(PrivacyBudget)
        .where(
            PrivacyBudget.id == "global",
            PrivacyBudget.spent + epsilon <= PrivacyBudget.limit,
            PrivacyBudget.spent + epsilon <= config.epsilon_total,
        )
        .values(spent=PrivacyBudget.spent + epsilon)
    )
    if charged.rowcount != 1:
        raise PermissionError("Privacy budget exhausted")
    noisy = {
        key: None if count is None else max(0.0, count + laplace(epsilon))
        for key, count in cells.items()
    }
    db.add(
        AggregateRelease(
            id=dataset_id,
            dataset_id=dataset_id,
            fingerprint=fingerprint,
            cells=noisy,
            epsilon=epsilon,
        )
    )
    db.flush()
    db.refresh(budget)
    return {"cells": noisy, "budget_remaining": budget.limit - budget.spent, "is_synthetic": True}
