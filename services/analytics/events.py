"""Outcome metrics (issue 46): one place that defines every event the analyst sees and where it comes from.

Counts are grouped by language and reading level and passed through the same threshold suppression as the cohort
aggregates (configs/privacy.yaml min_cell). There is deliberately no metric about marriages, engagements or
pregnancies: KinSight measures understanding and access to care, never the choices people make."""
from __future__ import annotations

import time
from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from services.consent.aggregates import suppress
from services.consent.models import AuditEvent, Person
from services.consent.policy import reference
from services.lifecycle.store import CascadeContact, FhirImport, LcBooking, PrepSheet, ReviewItem

# name -> (what it counts, where it comes from). `audit:<action>` means a log_change action written by the API.
EVENTS = {
    "result_viewed": ("people who opened their own result", "consent_person.result_viewed_at"),
    "teach_back_passed": ("people who passed the check-your-understanding questions", "audit:teach_back_passed"),
    "prep_sheet_created": ("people with a preparation sheet", "lc_prep_sheet"),
    "prep_sheet_shared": ("people who shared part of their preparation sheet", "lc_prep_sheet.shared"),
    "session_booked": ("people with a booked counselling session", "lc_booking"),
    "counsellor_requested": ("requests to talk with a counsellor", "lc_review_item:counselling_request"),
    "cascade_reached": ("relatives the person chose to reach", "lc_cascade_contact"),
    "cascade_tested": ("relatives who reported getting tested", "lc_cascade_contact.tested"),
    "imports_confirmed": ("reports imported from an EHR sandbox", "lc_fhir_import"),
    "reviews_overdue": ("review items past their expected time", "lc_review_item.due_at"),
}
RATES = {"result_viewed", "teach_back_passed", "prep_sheet_created", "prep_sheet_shared", "session_booked"}
GAP = 0.10  # equity alert: a rate differs by more than 10 points between language groups


def collect(db: Session, salt: bytes, now: float | None = None) -> dict[str, Counter]:
    """Raw counts per metric, keyed by "<language>/<reading level>" for people, or "all" for workflow counts."""
    now = time.time() if now is None else now
    people = {p.id: f"{p.language}/{p.reading_level}" for p in db.scalars(select(Person))}
    group = lambda pid: people.get(pid)  # noqa: E731  (unknown ids are not people; they are not counted per group)
    refs = {reference(pid, salt): g for pid, g in people.items()}
    out: dict[str, Counter] = {"population": Counter(people.values())}
    out["result_viewed"] = Counter(people[p.id] for p in db.scalars(select(Person).where(Person.result_viewed_at.is_not(None))))
    passed = {e.actor_ref for e in db.scalars(select(AuditEvent).where(AuditEvent.action == "teach_back_passed"))}
    out["teach_back_passed"] = Counter(refs[r] for r in passed if r in refs)
    sheets = db.scalars(select(PrepSheet)).all()
    out["prep_sheet_created"] = Counter(g for s in sheets if (g := group(s.subject_id)))
    out["prep_sheet_shared"] = Counter(g for s in sheets if s.shared != "[]" and (g := group(s.subject_id)))
    out["session_booked"] = Counter(g for b in db.scalars(select(LcBooking).where(LcBooking.status == "active")) if (g := group(b.actor)))
    reviews = db.scalars(select(ReviewItem)).all()
    out["counsellor_requested"] = Counter({"all": sum(r.kind == "counselling_request" for r in reviews)})
    contacts = db.scalars(select(CascadeContact)).all()
    out["cascade_reached"] = Counter({"all": sum(c.status != "not_contacted" for c in contacts)})
    out["cascade_tested"] = Counter({"all": sum(c.status == "tested" for c in contacts)})
    out["imports_confirmed"] = Counter({"all": len(db.scalars(select(FhirImport)).all())})
    out["reviews_overdue"] = Counter({"all": sum(r.state in ("pending", "held", "more_info") and r.due_at < now for r in reviews)})
    return out


def outcomes(db: Session, salt: bytes, min_cell: int, now: float | None = None) -> dict:
    """Suppressed metrics plus equity alerts. A group below min_cell hides the whole breakdown, as for the cohort."""
    raw = collect(db, salt, now)
    population = raw.pop("population")
    groups = sorted(population)
    metrics = []
    for name, (label, source) in EVENTS.items():
        counts = raw[name]
        keys = groups if name in RATES else ["all"]
        cells = suppress({k: counts.get(k, 0) for k in keys}, min_cell) if keys else {}
        total = sum(counts.values())
        row = {"name": name, "label": label, "source": source, "total": total if total >= min_cell else None, "groups": cells}
        if name in RATES and keys:
            denominators = suppress({k: population[k] for k in keys}, min_cell)
            rates = {k: None if cells[k] is None or not denominators[k] else cells[k] / denominators[k] for k in keys}
            known = [r for r in rates.values() if r is not None]
            row["rates"] = rates
            row["equity_alert"] = len(known) > 1 and max(known) - min(known) > GAP
        metrics.append(row)
    return {"metrics": metrics, "min_cell": min_cell, "marriage_outcomes_measured": False}
