"""Cascade screening tracker (issue 38).

The person sees which relatives may want testing, with an educational estimate for each, and records how they chose
to reach each one. A relative only ever gets a condition-scoped invite: the tracker learns "opened", "tested" or
"declined" through hashed codes, and no relative endpoint returns the sender's name or genotype."""
import base64
import hashlib
import hmac
import json
import time
import uuid
from typing import Literal

from fastapi import Depends, HTTPException
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from services.cohort.panel import load_panel
from services.consent import sharing
from services.genetics.cascade import relatives
from services.genetics.pedigree import Pedigree, PedigreeError
from services.lifecycle import store
from services.lifecycle.cascade import CascadeTokens
from services.lifecycle.store import CascadeContact

from ..auth import secret
from ..schemas import Alias, StrictModel, estimate

STATUSES = ("not_contacted", "invited", "opened", "tested", "declined", "told", "notified")


class Contact(StrictModel):
    relative_id: Alias
    condition_id: Alias
    method: Literal["invite", "whisper", "in_person", "none"]


class Outcome(StrictModel):
    code: str = Field(min_length=10, max_length=200, pattern=r"^[a-f0-9]+\.[a-f0-9]{64}$")
    outcome: Literal["tested", "declined"]


def _nonce(token: str) -> str:
    return json.loads(base64.urlsafe_b64decode(token.rsplit(".", 1)[0].encode()))["n"]


def _hash(nonce: str) -> str:
    return hashlib.sha256(nonce.encode()).hexdigest()


def _sign(nonce: str) -> str:
    return hmac.new(secret("KINSIGHT_TOKEN_SECRET"), b"cascade-follow-up\0" + nonce.encode(), hashlib.sha256).hexdigest()


def opened(db: Session, token: str) -> str | None:
    """Called after a successful redeem: marks the sender's tracker row opened and hands the relative a follow-up code
    for an optional "I got tested" later. Returns None for invites that were not sent from the tracker."""
    nonce = _nonce(token)
    row = db.scalar(select(CascadeContact).where(CascadeContact.invite_hash == _hash(nonce)))
    if row is None:
        return None
    if row.status == "invited":
        row.status, row.updated_at = "opened", time.time()
    db.commit()
    return f"{nonce}.{_sign(nonce)}"


def build(people: list[dict], edges: list[dict]) -> tuple[Pedigree, dict[str, set[str]]]:
    ped, partners = Pedigree(), {}
    for p in people:
        ped.add_person(p["id"], p["sex"])
    for e in edges:
        if e["type"] == "parent_of":
            ped.add_parent(e["b_id"], e["a_id"], e.get("confidence", "known"))
        elif e["type"] == "partner_of":
            partners.setdefault(e["a_id"], set()).add(e["b_id"])
            partners.setdefault(e["b_id"], set()).add(e["a_id"])
    return ped, partners


def register(app, *, adapter, db_session, roles, own, limit):
    panel = {c.id: c for c in load_panel().conditions}

    async def tracker(db: Session, subject: str) -> list[dict]:
        pedigree = await adapter.invoke("pedigree", subject, None, db)
        results = await adapter.invoke("results", subject, None, db)
        try:
            ped, partners = build(pedigree["people"], pedigree["relationships"])
        except (PedigreeError, KeyError):
            raise HTTPException(409, "The family tree needs fixing before relatives can be listed") from None
        if subject not in ped.sex:
            return []
        rows = {(r.relative_id, r.condition_id): r for r in db.scalars(select(CascadeContact).where(CascadeContact.owner_id == subject))}
        out = []
        for res in results:
            cond = panel.get(res["condition_id"])
            if res["status"] != "carrier" or cond is None:
                continue
            if cond.inheritance != "AR":  # X-linked patterns depend on sex and side of the family: a counsellor explains them
                out.append({"condition_id": cond.id, "inheritance": cond.inheritance, "needs_counsellor": True, "relatives": []})
                continue
            listed = []
            for rel in relatives(ped, subject, cond.carrier_frequency, partners.get(subject, set())):
                row = rows.get((rel["id"], cond.id))
                listed.append({"id": rel["id"], "relation": rel["relation"], "degree": rel["degree"],
                               "chance": estimate(rel["chance"], "cascade_relative"),
                               "status": row.status if row else "not_contacted", "method": row.method if row else None})
            out.append({"condition_id": cond.id, "inheritance": cond.inheritance, "needs_counsellor": False, "relatives": listed})
        return out

    @app.get("/api/lifecycle/cascade-tracker")
    async def view(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, "pedigree", {"relationships"})
        conditions = await tracker(db, identity.actor.id)
        counts = {s: 0 for s in STATUSES}
        for c in conditions:
            for r in c["relatives"]:
                counts[r["status"]] += 1
        return {"conditions": conditions, "counts": counts, "is_synthetic": True}

    @app.post("/api/lifecycle/cascade-tracker/contact")
    async def contact(body: Contact, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, "pedigree", {"relationships"})
        limit(db, identity)
        subject = identity.actor.id
        listed = {(r["id"], c["condition_id"]) for c in await tracker(db, subject) for r in c["relatives"]}
        if (body.relative_id, body.condition_id) not in listed:
            raise HTTPException(404, "Not a listed relative for this result")
        row = db.scalar(select(CascadeContact).where(CascadeContact.owner_id == subject,
                                                     CascadeContact.relative_id == body.relative_id,
                                                     CascadeContact.condition_id == body.condition_id))
        if row is None:
            row = CascadeContact(id=str(uuid.uuid4()), owner_id=subject, relative_id=body.relative_id,
                                 condition_id=body.condition_id, method="none", status="not_contacted", updated_at=0)
            db.add(row)
        token = None
        if body.method == "invite":
            tokens = CascadeTokens(secret("KINSIGHT_TOKEN_SECRET"))
            tokens.used = store.UsedNonces(db)
            token = tokens.mint(body.condition_id.lower(), time.time())  # the invite carries the condition only
            row.invite_hash = _hash(_nonce(token))
        row.method = body.method
        row.status = {"invite": "invited", "whisper": "notified", "in_person": "told", "none": "not_contacted"}[body.method]
        row.updated_at = time.time()
        sharing.log_change(db, identity.actor, row.id, f"cascade_{body.method}", secret("KINSIGHT_AUDIT_SALT"))
        db.commit()
        return {"status": row.status, **({"token": token} if token else {}), "is_synthetic": True}

    @app.post("/api/lifecycle/cascade/outcome")
    def outcome(body: Outcome, identity=Depends(roles("relative", "person")), db: Session = Depends(db_session)):
        """A relative may say they got tested or chose not to. They learn nothing back."""
        limit(db, identity)
        nonce, sig = body.code.split(".")
        row = db.scalar(select(CascadeContact).where(CascadeContact.invite_hash == _hash(nonce)))
        if not hmac.compare_digest(sig, _sign(nonce)) or row is None:
            raise HTTPException(403, "Access unavailable")
        row.status, row.updated_at = body.outcome, time.time()
        sharing.log_change(db, identity.actor, row.id, "cascade_outcome", secret("KINSIGHT_AUDIT_SALT"))
        db.commit()
        return {"status": "recorded", "is_synthetic": True}
