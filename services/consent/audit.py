"""Content-free hash chain. Anchor the head externally to detect tail truncation."""

import hashlib
import json
import time
from typing import cast

from sqlalchemy import Table, create_engine, select
from sqlalchemy.orm import Session

from .models import AuditEvent

GENESIS = "0" * 64


def digest(event: AuditEvent) -> str:
    payload = {
        column.key: getattr(event, column.key)
        for column in AuditEvent.__table__.columns
        if column.key != "hash"
    }
    encoded = json.dumps(
        payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False
    )
    return hashlib.sha256((event.prev_hash + encoded).encode()).hexdigest()


def append_event(
    session: Session,
    *,
    actor_ref: str,
    action: str,
    resource_type: str,
    resource_ref: str,
    decision: str,
    reason_code: str,
    consent_ids: list[str] | None = None,
) -> AuditEvent:
    # The unique predecessor and primary key reject concurrent forks; retry whole transactions.
    previous = session.scalar(select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1))
    event = AuditEvent(
        id=previous.id + 1 if previous else 1,
        ts=time.time(),
        actor_ref=actor_ref,
        action=action,
        resource_type=resource_type,
        resource_ref=resource_ref,
        decision=decision,
        reason_code=reason_code,
        consent_ids=consent_ids or [],
        prev_hash=previous.hash if previous else GENESIS,
        is_synthetic=True,
    )
    event.hash = digest(event)
    session.add(event)
    session.flush()
    return event


def verify_chain(session: Session, expected_head: str | None = None) -> bool:
    previous = GENESIS
    for index, event in enumerate(session.scalars(select(AuditEvent).order_by(AuditEvent.id)), 1):
        if event.id != index or event.prev_hash != previous or event.hash != digest(event):
            return False
        previous = event.hash
    return expected_head is None or previous == expected_head


def verify_tamper_example() -> int | None:
    """Verify a deliberately altered fixture in a disposable database."""
    engine = create_engine("sqlite://")
    try:
        cast(Table, AuditEvent.__table__).create(engine)
        with Session(engine) as session:
            event = append_event(
                session, actor_ref="synthetic-actor", action="read", resource_type="result",
                resource_ref="synthetic-result", decision="deny", reason_code="default_deny",
            )
            event.reason_code = "tampered"
            return None if verify_chain(session) else event.id
    finally:
        engine.dispose()
