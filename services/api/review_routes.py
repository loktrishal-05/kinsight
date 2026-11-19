"""Unified counsellor review queue (issue 40). Items carry references, never content: the counsellor opens the
dedicated review for content, and the person only ever learns that a counsellor is looking and when to expect it."""
from typing import Annotated, Literal

from fastapi import Depends, HTTPException
from pydantic import Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from services.consent import sharing
from services.consent.models import Couple
from services.consent.policy import ResourceRef
from services.lifecycle import review
from services.lifecycle.store import ReviewItem

from .auth import secret
from .schemas import Alias, StrictModel

LINKS = {"couple_result": "/counsellor", "fhir_import": "/counsellor#fhir-review-heading",
         "lab_report": "/lab-sandbox", "counselling_request": "/counsellor", "reclassification": "/clinic"}


class Decision(StrictModel):
    decision: Literal["approve", "edit", "hold", "more_info"]
    reason_code: Alias
    note: Annotated[str, Field(max_length=500)] = ""


def view(row: ReviewItem, rules: dict) -> dict:
    return {"id": row.id, "kind": row.kind, "reason": row.reason, "state": row.state, "subject": row.subject_id,
            "created_at": row.created_at, "due_at": row.due_at, "dedicated": rules[row.kind]["dedicated"],
            "link": LINKS.get(row.kind, "/counsellor")}


def register(app, *, db_session, roles, check, own, limit):
    @app.get("/api/lifecycle/review-queue")
    def queue(identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        check(db, identity, ResourceRef("queue", "review"), {"status"})
        rules = review.rules()
        rows = db.scalars(select(ReviewItem).order_by(ReviewItem.due_at)).all()
        items = [view(r, rules) for r in rows]
        return {"items": sorted(items, key=lambda i: (i["state"] not in review.OPEN, i["due_at"])), "is_synthetic": True}

    @app.post("/api/lifecycle/review-queue/{item_id}/decision")
    def decide(item_id: Alias, body: Decision, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        check(db, identity, ResourceRef("queue", "review"), {"status"})
        limit(db, identity)
        try:
            row = review.decide(db, item_id, body.decision, body.reason_code)
        except LookupError:
            raise HTTPException(404, "Unknown item") from None
        except PermissionError as error:
            raise HTTPException(409, str(error)) from None
        sharing.log_change(db, identity.actor, row.id, f"review_{body.decision}", secret("KINSIGHT_AUDIT_SALT"))
        db.commit()
        return {"status": row.state, "is_synthetic": True}

    @app.get("/api/lifecycle/review-items")
    def mine(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        """What is waiting for a counsellor, for this person: kind, state and expected time only. Never content."""
        own(db, identity, "lifecycle", {"status"})
        me = identity.actor.id
        couples = select(Couple.id).where(or_(Couple.person_a == me, Couple.person_b == me))
        rows = db.scalars(select(ReviewItem).where(
            or_(ReviewItem.subject_id == me, ReviewItem.subject_id.in_(couples)))).all()
        rules = review.rules()
        return {"items": [{"kind": r.kind, "state": r.state, "due_at": r.due_at,
                           "expected_hours": rules[r.kind]["sla_hours"]} for r in rows], "is_synthetic": True}
