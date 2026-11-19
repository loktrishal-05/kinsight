"""Typed Kin actions, with deterministic results and explicit user input."""

import json
import time
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Depends, HTTPException
from pydantic import Field
from sqlalchemy import update
from sqlalchemy.orm import Session

from services.cohort.panel import load_panel
from services.consent import sharing
from services.lifecycle.store import PrepSheet

from .auth import secret
from .prep_routes import RESOURCE
from .scenario_routes import Relation, run_scenario
from .schemas import Alias, StrictModel


class Scenario(StrictModel):
    tool: Literal["run_scenario"]
    condition_id: Alias
    status_a: Literal["carrier", "not_detected"]
    status_b: Literal["carrier", "not_detected", "untested"]
    relation: Relation = "none"
    children: Annotated[int, Field(ge=1, le=6)] = 1
    lang: Annotated[str, Field(pattern=r"^[a-z]{2}$")] = "en"


class Prep(StrictModel):
    tool: Literal["add_question_to_prep"]
    text: Annotated[str, Field(min_length=1, max_length=300)]


def register(app, *, db_session, roles, own, limit):
    conditions = {c.id: c for c in load_panel().conditions}

    @app.post("/api/me/kin")
    def kin(body: Annotated[Scenario | Prep, Field(discriminator="tool")],
            identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, "profile" if isinstance(body, Scenario) else RESOURCE,
            {"id"} if isinstance(body, Scenario) else {"sections"})
        limit(db, identity)
        if isinstance(body, Scenario):
            data = run_scenario(conditions, body.condition_id, body.status_a, body.status_b,
                                body.relation, body.children, body.lang)
            sources = ["/methods", "/api/lifecycle/scenario"]
        else:
            question = body.text.strip()
            if not question:
                raise HTTPException(422, "A question is required")
            row = db.get(PrepSheet, identity.actor.id, with_for_update=True)
            if row is None:
                raise HTTPException(409, "Open and save a preparation sheet first")
            if "questions" in json.loads(row.shared):
                raise HTTPException(409, "Add the question directly to your shared preparation sheet")
            sheet = json.loads(row.payload)
            questions = sheet["questions"]
            if not any(item["text"] == question for item in questions):
                if len(questions) >= 30:
                    raise HTTPException(409, "The preparation sheet is full")
                questions.append({"id": uuid4().hex, "text": question})
                changed = db.execute(update(PrepSheet).where(
                    PrepSheet.subject_id == row.subject_id, PrepSheet.payload == row.payload,
                    PrepSheet.shared == row.shared,
                ).values(payload=json.dumps(sheet), updated_at=time.time()))
                if not changed.rowcount:
                    raise HTTPException(409, "The preparation sheet changed")
            data = {"url": "/prepare", "status": "saved"}
            sources = ["/api/lifecycle/prep"]
        sharing.log_change(db, identity.actor, identity.actor.id, f"kin_{body.tool}", secret("KINSIGHT_AUDIT_SALT"))
        db.commit()
        return {"tool": body.tool, "data": data, "sources": sources, "is_synthetic": True}
