"""Default-deny policy. Callers must project responses to allowed_fields."""

import hashlib
import hmac
import time
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from .audit import append_event
from .models import Consent, Couple, Person

PURPOSES = frozenset({"own_care", "couple_planning", "counselling", "family_notification"})
RESOURCE_FIELDS = {
    "profile": {"id", "language", "reading_level"},
    "result": {"condition_id", "status", "panel_version"},
    "explanation": {"blocks", "released"},
    "consent": {"id", "grantee_id", "scope", "purpose", "expires_at", "revoked_at"},
    "audit": {"events"},
    "pedigree": {"relationships", "warnings"},
    "couple": {"tier", "shared_conditions", "findings", "engine_version"},
    "case": {"status", "referral", "quiz", "brief"},
    "invitation": {"id", "scope", "status"},
    "aggregate": {"cells", "budget_remaining"},
    "governance": {"metadata"},
    "evaluation": {"metrics"},
    "demo": {"status"},
}
ROLE_RESOURCES = {
    "person": {
        "profile",
        "result",
        "explanation",
        "consent",
        "audit",
        "pedigree",
        "case",
        "invitation",
    },
    "partner": {"couple", "result", "invitation"},
    "relative": {"result", "pedigree", "case", "invitation"},
    "counsellor": {"case", "result", "explanation", "pedigree", "couple"},
    "analyst": {"aggregate", "evaluation"},
    "auditor": {"audit", "governance", "evaluation"},
    "demo_operator": {"demo"},
}
SCOPES = {
    "couple_tier_only": {"tier"},
    "couple_summary": {
        "tier",
        "shared_conditions",
        "findings",
        "engine_version",
        "brief",
        "referral",
    },
    "condition_findings": {"condition_id", "status", "panel_version", "findings"},
    "relationship_only": {"relationships", "warnings"},
    "quiz_status": {"status", "quiz"},
    "couple_pooling": {"tier", "shared_conditions", "findings", "engine_version"},
}


@dataclass(frozen=True)
class Actor:
    id: str
    role: str


@dataclass(frozen=True)
class ResourceRef:
    type: str
    id: str
    owner_id: str | None = None
    condition_id: str | None = None
    owner_viewed: bool = False
    assigned_to: str | None = None
    assignment_expires_at: float = 0
    assignment_reason: str | None = None


@dataclass(frozen=True)
class Decision:
    allowed: bool
    allowed_fields: frozenset[str] = field(default_factory=frozenset)
    reason_code: str = "default_deny"
    consent_ids: tuple[str, ...] = ()


def reference(value: str, salt: bytes) -> str:
    if len(salt) < 32:
        raise ValueError("Audit salt must contain at least 32 bytes")
    return hmac.new(salt, value.encode(), hashlib.sha256).hexdigest()


def pooling_allowed(db: Session, couple: Couple | None) -> bool:
    if couple is None:
        return False
    now = time.time()
    for owner, other in [(couple.person_a, couple.person_b), (couple.person_b, couple.person_a)]:
        person = db.get(Person, owner, populate_existing=True)
        if person is None or person.result_viewed_at is None:
            return False
        consent = db.scalar(
            select(Consent.id)
            .where(
                Consent.grantor_id == owner,
                Consent.grantee_id == other,
                Consent.resource_type == "couple",
                Consent.resource_id == couple.id,
                Consent.scope == "couple_pooling",
                Consent.purpose == "couple_planning",
                Consent.revoked_at.is_(None),
                Consent.granted_at <= now,
                Consent.expires_at > now,
            )
            .limit(1)
        )
        if consent is None:
            return False
    return True


def couple_readable(db: Session, resource: ResourceRef) -> bool:
    couple = db.get(Couple, resource.id, populate_existing=True)
    return bool(couple and couple.released and pooling_allowed(db, couple))


def decide(
    actor: Actor,
    resource: ResourceRef,
    purpose: str,
    fields: set[str],
    *,
    session: Session,
    audit_salt: bytes,
) -> Decision:
    """Audit in the caller's transaction; commit even when denying a request."""
    now = time.time()
    decision = Decision(False)
    if resource.type not in ROLE_RESOURCES.get(actor.role, set()):
        decision = Decision(False, reason_code="role_denied")
    elif purpose not in PURPOSES:
        decision = Decision(False, reason_code="purpose_denied")
    elif not fields or not fields <= RESOURCE_FIELDS.get(resource.type, set()):
        decision = Decision(False, reason_code="fields_denied")
    elif resource.type == "couple" and not couple_readable(session, resource):
        decision = Decision(False, reason_code="pooling_or_release_required")
    elif resource.type in {"aggregate", "governance", "evaluation", "demo"} or (
        resource.type == "audit" and actor.role == "auditor"
    ):
        decision = Decision(True, frozenset(fields), "role_metadata")
    elif (
        (actor.role == "person" or resource.type == "invitation")
        and resource.owner_id == actor.id
        and purpose == "own_care"
    ):
        decision = Decision(True, frozenset(fields), "owner")
    elif actor.role == "person":
        decision = Decision(False, reason_code="owner_required")
    elif not resource.owner_viewed:
        decision = Decision(False, reason_code="owner_first")
    elif actor.role == "counsellor" and not (
        resource.assigned_to == actor.id
        and resource.assignment_expires_at > now
        and resource.assignment_reason
        and purpose == "counselling"
    ):
        decision = Decision(False, reason_code="assignment_required")
    else:
        grants = session.scalars(
            select(Consent).where(
                Consent.grantor_id == resource.owner_id,
                Consent.grantee_id == actor.id,
                Consent.resource_type == resource.type,
                Consent.resource_id == resource.id,
                Consent.purpose == purpose,
                Consent.revoked_at.is_(None),
                Consent.granted_at <= now,
                Consent.expires_at > now,
            )
        ).all()
        allowed_fields: set[str] = set()
        consent_ids = []
        for grant in grants:
            if grant.scope == "couple_pooling":
                continue  # Pooling is checked separately for both owners; it is not a read grant.
            if grant.scope == "condition_findings" and (
                resource.condition_id is None or resource.condition_id not in grant.condition_ids
            ):
                continue
            permitted = fields & set(grant.fields) & SCOPES.get(grant.scope, set())
            if permitted:
                allowed_fields.update(permitted)
                consent_ids.append(grant.id)
        if allowed_fields:
            decision = Decision(
                True, frozenset(allowed_fields), "consent", tuple(sorted(consent_ids))
            )
    append_event(
        session,
        actor_ref=reference(actor.id, audit_salt),
        action="read",
        resource_type=resource.type if resource.type in RESOURCE_FIELDS else "unknown",
        resource_ref=reference(resource.id, audit_salt),
        decision="allow" if decision.allowed else "deny",
        reason_code=decision.reason_code,
        consent_ids=[reference(i, audit_salt) for i in decision.consent_ids],
    )
    return decision
