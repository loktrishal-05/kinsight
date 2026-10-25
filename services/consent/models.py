"""Synthetic consent storage; timestamps are UTC Unix seconds on every backend."""

import time
import uuid

from sqlalchemy import JSON, Boolean, CheckConstraint, Float, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Synthetic:
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Consent(Synthetic, Base):
    __tablename__ = "consent"
    __table_args__ = (CheckConstraint("is_synthetic = true"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    grantor_id: Mapped[str] = mapped_column(String, index=True)
    grantee_id: Mapped[str] = mapped_column(String, index=True)
    resource_type: Mapped[str] = mapped_column(String)
    resource_id: Mapped[str] = mapped_column(String)
    scope: Mapped[str] = mapped_column(String)
    fields: Mapped[list[str]] = mapped_column(JSON)
    condition_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    purpose: Mapped[str] = mapped_column(String)
    granted_at: Mapped[float] = mapped_column(Float, default=time.time)
    expires_at: Mapped[float] = mapped_column(Float)
    revoked_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    text_shown_hash: Mapped[str] = mapped_column(String)


class AuditEvent(Synthetic, Base):
    __tablename__ = "audit_event"
    __table_args__ = (CheckConstraint("is_synthetic = true"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[float] = mapped_column(Float, default=time.time)
    actor_ref: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    resource_type: Mapped[str] = mapped_column(String)
    resource_ref: Mapped[str] = mapped_column(String)
    decision: Mapped[str] = mapped_column(String)
    reason_code: Mapped[str] = mapped_column(String)
    consent_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    prev_hash: Mapped[str] = mapped_column(String, unique=True)
    hash: Mapped[str] = mapped_column(String, unique=True)


class Person(Synthetic, Base):
    __tablename__ = "consent_person"
    __table_args__ = (CheckConstraint("is_synthetic = true"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    language: Mapped[str] = mapped_column(String, default="en")
    reading_level: Mapped[str] = mapped_column(String, default="basic")
    result_viewed_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class Invitation(Synthetic, Base):
    __tablename__ = "invitation"
    __table_args__ = (CheckConstraint("is_synthetic = true"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id: Mapped[str] = mapped_column(String)
    recipient_id: Mapped[str] = mapped_column(String)
    scope: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="pending")
    expires_at: Mapped[float] = mapped_column(Float)


class Couple(Synthetic, Base):
    __tablename__ = "consent_couple"
    __table_args__ = (CheckConstraint("is_synthetic = true"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    person_a: Mapped[str] = mapped_column(String)
    person_b: Mapped[str] = mapped_column(String)
    released: Mapped[bool] = mapped_column(Boolean, default=False)


class ShareEvent(Synthetic, Base):
    __tablename__ = "share_event"
    __table_args__ = (CheckConstraint("is_synthetic = true"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    invitation_ref: Mapped[str] = mapped_column(String)
    scope: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    ts: Mapped[float] = mapped_column(Float, default=time.time)


class PrivacyBudget(Synthetic, Base):
    __tablename__ = "privacy_budget"
    __table_args__ = (
        CheckConstraint("is_synthetic = true"),
        CheckConstraint("spent >= 0"),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    spent: Mapped[float] = mapped_column(Float, default=0)
    limit: Mapped[float] = mapped_column(Float)


class AggregateRelease(Synthetic, Base):
    __tablename__ = "aggregate_release"
    __table_args__ = (CheckConstraint("is_synthetic = true"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    dataset_id: Mapped[str] = mapped_column(String, unique=True)
    fingerprint: Mapped[str] = mapped_column(String)
    cells: Mapped[dict] = mapped_column(JSON)
    epsilon: Mapped[float] = mapped_column(Float)


class CaseAccess(Synthetic, Base):
    """Access metadata supplied by the case service, never by API clients."""

    __tablename__ = "case_access"
    __table_args__ = (CheckConstraint("is_synthetic = true"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[str] = mapped_column(String, index=True)
    couple_id: Mapped[str | None] = mapped_column(String, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String, nullable=True)
    assignment_expires_at: Mapped[float] = mapped_column(Float, default=0)
    assignment_reason: Mapped[str | None] = mapped_column(String, nullable=True)


class RateWindow(Synthetic, Base):
    __tablename__ = "consent_rate_window"
    __table_args__ = (CheckConstraint("is_synthetic = true"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    window: Mapped[int] = mapped_column(Integer)
    requests: Mapped[int] = mapped_column(Integer)
