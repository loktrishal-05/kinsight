"""Typed Kin actions, with deterministic results and explicit user input."""

import json
import time
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Depends, HTTPException
from pydantic import Field
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from services.agents import kin as chooser
from services.cohort.panel import load_panel
from services.consent import sharing
from services.consent.models import Consent, Couple
from services.consent.policy import RESOURCE_FIELDS
from services.lifecycle import review
from services.lifecycle.store import PrepSheet, ReviewItem

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


TurnText = Annotated[str, Field(min_length=1, max_length=2000)]


class Chat(StrictModel):
    tool: Literal["chat"]
    text: TurnText
    history: Annotated[list[TurnText], Field(max_length=4)] = Field(default_factory=list)
    lang: Literal["en", "ar", "hi", "ta", "te", "kn", "ml"] = "en"


LINKS = {
    "get_my_result": "/result", "glossary": "/learn", "run_scenario": "/plan/scenarios",
    "my_consents": "/consents", "next_steps": "/next", "add_question_to_prep": "/prepare",
    "counsellor": "/next", "review_waiting": "/result",
}


def review_waiting(db, subject):
    couples = select(Couple.id).where(or_(Couple.person_a == subject, Couple.person_b == subject))
    return db.scalar(select(ReviewItem.id).where(
        ReviewItem.kind == "couple_result", ReviewItem.state.in_(review.OPEN),
        ReviewItem.subject_id.in_(couples),
    ).limit(1)) is not None


def chat(body, identity, db, own, limit, backend):
    if backend is None or not chooser.enabled():
        return {"mode": "deterministic"}
    person = own(db, identity, "profile", {"id", "reading_level"})
    limit(db, identity)
    subject = identity.actor.id
    content = chooser.pack(body.lang)
    reply = {"mode": "grounded", "text": "", "sources": [], "is_synthetic": True}
    if any(chooser.blocked(turn) for turn in [*body.history, body.text]):
        tool = "refused"
        reply.update(text=content["kin"]["refusal"], refused=True)
    elif chooser.COUNSELLOR.fullmatch(body.text.strip()):
        own(db, identity, "lifecycle", {"status"})
        db.refresh(person, with_for_update=True)
        review.enqueue(db, "counselling_request", subject, f"{subject}:kin")
        tool = "counsellor"
        reply["sources"] = ["/api/lifecycle/review-items"]
    else:
        choice = chooser.choose(body.history, body.text, tuple(content["glossary"]))
        if choice is None:
            return {"mode": "deterministic"}
        tool, key = choice
        if tool in {"get_my_result", "explain_block"}:
            own(db, identity, "lifecycle", {"status"})
            if review_waiting(db, subject):
                tool = "review_waiting"
                reply["sources"] = ["/api/lifecycle/review-items"]
        if tool == "get_my_result":
            own(db, identity, "result", RESOURCE_FIELDS["result"])
            reply.update(results=backend.op_results(subject, None, db), sources=["/api/me/results"])
        elif tool == "explain_block":
            block = backend.templates[(body.lang, person.reading_level)][key]
            reply.update(text=block.text, sources=[f"template:{body.lang}/{person.reading_level}/{block.block_id}"])
        elif tool == "glossary":
            entry = content["glossary"][key]
            reply.update(text=f"{entry['term']}. {entry['meaning']}", sources=[f"glossary:{key}"])
        elif tool == "my_consents":
            own(db, identity, "consent", RESOURCE_FIELDS["consent"])
            scopes = sorted(set(db.scalars(select(Consent.scope).where(
                Consent.grantor_id == subject, Consent.revoked_at.is_(None), Consent.expires_at > time.time(),
            ))))
            reply.update(scopes=scopes, sources=["/api/me/consents"])
        elif tool != "review_waiting":
            reply["sources"] = [{
                "run_scenario": "/api/lifecycle/scenario", "next_steps": "/next",
                "add_question_to_prep": "/api/lifecycle/prep",
            }[tool]]
    sharing.log_change(db, identity.actor, subject, f"kin_{tool}", secret("KINSIGHT_AUDIT_SALT"))
    db.commit()
    return {**reply, "tool": tool, "link": LINKS.get(tool)}


def register(app, *, db_session, roles, own, limit, backend):
    conditions = {c.id: c for c in load_panel().conditions}

    @app.post("/api/me/kin")
    def kin(body: Annotated[Scenario | Prep | Chat, Field(discriminator="tool")],
            identity=Depends(roles("person")), db: Session = Depends(db_session)):
        if isinstance(body, Chat):
            return chat(body, identity, db, own, limit, backend)
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
