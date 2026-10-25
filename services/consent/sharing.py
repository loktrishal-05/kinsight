"""Invitations never disclose results or imply permission to pool them."""

import hashlib
import math
import time

from sqlalchemy.orm import Session

from .audit import append_event
from .models import CaseAccess, Consent, Couple, Invitation, Person, ShareEvent
from .policy import PURPOSES, RESOURCE_FIELDS, SCOPES, Actor, reference
from .settings import settings


def log_change(db: Session, actor: Actor, resource_id: str, action: str, salt: bytes) -> None:
    append_event(
        db,
        actor_ref=reference(actor.id, salt),
        action=action,
        resource_type="consent",
        resource_ref=reference(resource_id, salt),
        decision="deny" if action == "role_denied" else "allow",
        reason_code=action,
    )


def grant(
    db: Session,
    actor: Actor,
    *,
    grantee_id: str,
    resource_type: str,
    resource_id: str,
    scope: str,
    fields: list[str],
    purpose: str,
    expires_at: float,
    text_shown: str,
    salt: bytes,
    condition_ids: list[str] | None = None,
) -> Consent:
    now = time.time()
    if actor.role != "person" or db.get(Person, actor.id) is None:
        raise PermissionError("Owner required")
    if (
        not math.isfinite(expires_at)
        or not now < expires_at <= now + settings().consent_max_seconds
    ):
        raise ValueError("Invalid expiry")
    if (
        scope not in SCOPES
        or purpose not in PURPOSES
        or not fields
        or not set(fields) <= SCOPES[scope] & RESOURCE_FIELDS.get(resource_type, set())
        or not text_shown
        or len(text_shown) > 4000
    ):
        raise ValueError("Invalid consent")
    if scope == "condition_findings" and not condition_ids:
        raise ValueError("Condition scope requires condition ids")
    if resource_type == "couple":
        couple = db.get(Couple, resource_id)
        if (
            couple is None
            or actor.id not in {couple.person_a, couple.person_b}
            or grantee_id not in {couple.person_a, couple.person_b} - {actor.id}
            or purpose != "couple_planning"
        ):
            raise PermissionError("Couple membership required")
    elif resource_type == "case":
        case = db.get(CaseAccess, resource_id)
        if case is None or case.owner_id != actor.id:
            raise PermissionError("Case owner required")
    elif scope == "couple_pooling" or resource_id != actor.id:
        raise PermissionError("Owner resource required")
    row = Consent(
        grantor_id=actor.id,
        grantee_id=grantee_id,
        resource_type=resource_type,
        resource_id=resource_id,
        scope=scope,
        fields=fields,
        purpose=purpose,
        condition_ids=condition_ids or [],
        granted_at=now,
        expires_at=expires_at,
        text_shown_hash=hashlib.sha256(text_shown.encode()).hexdigest(),
    )
    db.add(row)
    db.flush()
    log_change(db, actor, row.id, "grant", salt)
    return row


def revoke(db: Session, actor: Actor, consent_id: str, salt: bytes) -> None:
    row = db.get(Consent, consent_id)
    if row is None or row.grantor_id != actor.id or actor.role != "person":
        raise PermissionError("Owner required")
    row.revoked_at = time.time()
    if row.resource_type == "couple":
        couple = db.get(Couple, row.resource_id)
        if couple:
            couple.released = False
    log_change(db, actor, row.id, "revoke", salt)
    db.flush()


def invite(db: Session, actor: Actor, recipient_id: str, scope: str, salt: bytes) -> Invitation:
    if (
        actor.role != "person"
        or db.get(Person, actor.id) is None
        or db.get(Person, recipient_id) is None
        or actor.id == recipient_id
    ):
        raise PermissionError("Synthetic sender and recipient required")
    if scope not in {"couple_summary", "couple_tier_only", "relationship_only"}:
        raise ValueError("Invalid invitation scope")
    row = Invitation(
        sender_id=actor.id,
        recipient_id=recipient_id,
        scope=scope,
        expires_at=time.time() + settings().consent_max_seconds,
    )
    db.add(row)
    db.flush()
    log_change(db, actor, row.id, "invite", salt)
    return row


def respond(
    db: Session, actor: Actor, invitation_id: str, accepted: bool, scope: str, salt: bytes
) -> Couple | None:
    row = db.get(Invitation, invitation_id)
    if (
        row is None
        or row.recipient_id != actor.id
        or row.status != "pending"
        or row.expires_at <= time.time()
        or actor.role not in {"person", "partner", "relative"}
    ):
        raise PermissionError("Pending recipient invitation required")
    if scope not in SCOPES or not SCOPES[scope] <= SCOPES[row.scope]:
        raise ValueError("Cannot expand invitation scope")
    row.status = "accepted" if accepted else "declined"
    row.scope = scope
    db.add(ShareEvent(invitation_ref=reference(row.id, salt), scope=scope, action=row.status))
    log_change(db, actor, row.id, "invitation_response", salt)
    couple = None
    if accepted and scope in {"couple_summary", "couple_tier_only"}:
        couple = Couple(person_a=row.sender_id, person_b=row.recipient_id)
        db.add(couple)
    db.flush()
    return couple
