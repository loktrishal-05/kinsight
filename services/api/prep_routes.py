"""Pre-counselling preparation sheet (issue 36).

A person writes the sheet for themselves. The counsellor can read only the sections the person has switched on, and only
while a revocable `prep_review` consent exists. Nothing is shared by default."""

import json
import time
from typing import Annotated, Literal

from fastapi import Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from services.agents.prep import SECTIONS, suggest
from services.consent import sharing
from services.consent.models import Consent
from services.consent.policy import ResourceRef
from services.lifecycle.store import PrepSheet

from .auth import secret
from .pilot_routes import Subject
from .schemas import Alias, StrictModel

RESOURCE = "prep_sheet"
REVIEWER = "synthetic-counsellor"
CONSENT_TEXT = "Share the sections of my preparation sheet that I switched on with the demo counsellor for 30 days."
Text = Annotated[str, Field(max_length=300)]


class Question(StrictModel):
    id: Alias
    text: Annotated[str, Field(min_length=1, max_length=300)]


class SheetIn(StrictModel):
    stage: Literal["premarital", "preconception", "pregnant"]
    values: Annotated[list[Alias], Field(max_length=10)] = []
    concerns: Annotated[list[Literal["family_reaction", "future_children", "cost", "religion", "privacy"]], Field(max_length=5)] = []
    worries_text: Annotated[str, Field(max_length=1000)] = ""
    questions: Annotated[list[Question], Field(max_length=30)] = []
    bring: Annotated[list[Literal["report", "id", "partner", "family_history"]], Field(max_length=4)] = []
    share: Annotated[list[Literal["values", "concerns", "questions", "bring"]], Field(max_length=4)] = []


def project(sheet: dict, sections) -> dict:
    """Only the named sections, never the stage or anything else."""
    keep = {
        "values": ("values",), "concerns": ("concerns", "worries_text"), "questions": ("questions",), "bring": ("bring",),
    }
    return {k: sheet[k] for s in SECTIONS if s in sections for k in keep[s]}


def register(app, *, db_session, roles, own, check, limit):
    def active(consent_id):
        return select(Consent.id).where(
            Consent.id == consent_id, Consent.revoked_at.is_(None), Consent.expires_at > time.time())

    @app.get("/api/lifecycle/prep-suggestions")
    def suggestions(
        stage: Literal["premarital", "preconception", "pregnant"],
        lang: Annotated[str, Query(pattern=r"^[a-z]{2}$")] = "en",
        concerns: Annotated[list[Literal["family_reaction", "future_children", "cost", "religion", "privacy"]], Query()] = [],
        tier: Annotated[int | None, Query(ge=1, le=3)] = None,
        identity=Depends(roles("person")), db: Session = Depends(db_session),
    ):
        own(db, identity, RESOURCE, {"sections"})
        return {**suggest(lang, stage, concerns, tier), "is_synthetic": True}

    @app.get("/api/lifecycle/prep")
    def mine(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, RESOURCE, {"sections"})
        row = db.get(PrepSheet, identity.actor.id)
        return {"sheet": {**json.loads(row.payload), "share": json.loads(row.shared)} if row else None, "is_synthetic": True}

    @app.put("/api/lifecycle/prep")
    def save(body: SheetIn, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, RESOURCE, {"sections"})
        limit(db, identity)
        subject, salt = identity.actor.id, secret("KINSIGHT_AUDIT_SALT")
        row = db.get(PrepSheet, subject, with_for_update=True)
        if row is None:
            row = PrepSheet(subject_id=subject, payload="{}", shared="[]", updated_at=0)
            db.add(row)
        live = row.consent_id is not None and db.scalar(active(row.consent_id)) is not None
        if body.share and not live:
            row.consent_id = sharing.grant(
                db, identity.actor, grantee_id=REVIEWER, resource_type=RESOURCE, resource_id=subject,
                scope="prep_review", fields=["sections"], purpose="counselling",
                expires_at=time.time() + 30 * 86400, text_shown=CONSENT_TEXT, salt=salt).id
        elif not body.share and live:
            sharing.revoke(db, identity.actor, row.consent_id, salt)
        row.payload = body.model_dump_json(exclude={"share"})
        row.shared = json.dumps(sorted(body.share))
        row.updated_at = time.time()
        sharing.log_change(db, identity.actor, subject, "prep_saved", salt)
        db.commit()
        return {"status": "saved", "is_synthetic": True}

    @app.get("/api/lifecycle/prep-review/{subject}")
    def review(subject: Subject, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        decision = check(
            db, identity, ResourceRef(
                RESOURCE, subject, subject, owner_viewed=True, assigned_to=REVIEWER,
                assignment_expires_at=4_000_000_000.0, assignment_reason="prep_review"),
            {"sections"}, "counselling", True)
        row = db.get(PrepSheet, subject)
        if row is None or row.consent_id not in decision.consent_ids or not db.scalar(active(row.consent_id)):
            raise HTTPException(403, "Access unavailable")
        return {"sections": project(json.loads(row.payload), json.loads(row.shared)), "shared": json.loads(row.shared),
                "is_synthetic": True}
