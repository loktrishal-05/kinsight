"""Persistent lifecycle state (SQLAlchemy: Postgres in production, SQLite locally and in tests).

The pure modules keep all the rules; this layer only loads a row into them and writes the result back. Synthetic data only.
Vouchers deliberately have no column that identifies the person who triggered them.
"""
from __future__ import annotations

import json
import uuid

from sqlalchemy import Float, Index, Integer, String, Text, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from . import cfg, tracking
from .cascade import WhisperQueue
from .pairing import Pairing, PairingStore


class LifecycleBase(DeclarativeBase):
    pass


class LcPairing(LifecycleBase):
    __tablename__ = "lc_pairing"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    initiator: Mapped[str] = mapped_column(String, index=True)
    pin: Mapped[str] = mapped_column(String)  # ephemeral (15 minutes); the row is useless after expiry
    expires_at: Mapped[float] = mapped_column(Float)
    partner: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String)


class LcInitiation(LifecycleBase):
    __tablename__ = "lc_initiation"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, index=True)
    at: Mapped[float] = mapped_column(Float)


class LcSample(LifecycleBase):
    __tablename__ = "lc_sample"
    owner: Mapped[str] = mapped_column(String, primary_key=True)
    barcode: Mapped[str] = mapped_column(String)
    stage: Mapped[int] = mapped_column(Integer)
    times: Mapped[str] = mapped_column(Text)  # JSON {stage: unix seconds}
    qc_failure: Mapped[str | None] = mapped_column(String, nullable=True)


class LcTokenUse(LifecycleBase):
    __tablename__ = "lc_token_use"
    nonce: Mapped[str] = mapped_column(String, primary_key=True)


class LcVoucher(LifecycleBase):
    __tablename__ = "lc_voucher"
    code: Mapped[str] = mapped_column(String, primary_key=True)
    phone_sha256: Mapped[str] = mapped_column(String)
    gene_family: Mapped[str] = mapped_column(String)
    send_at: Mapped[float] = mapped_column(Float, index=True)
    status: Mapped[str] = mapped_column(String, index=True)


class LcVault(LifecycleBase):
    __tablename__ = "lc_vault"
    actor: Mapped[str] = mapped_column(String, primary_key=True)
    real_hash: Mapped[str] = mapped_column(String)
    decoy_hash: Mapped[str] = mapped_column(String)
    failures: Mapped[int] = mapped_column(Integer, default=0)


# pairing -------------------------------------------------------------------------------------------------------------
def _row(p: Pairing) -> LcPairing:
    return LcPairing(id=p.id, initiator=p.initiator, pin=p.pin, expires_at=p.expires_at, partner=p.partner, status=p.status)


def _pairing(r: LcPairing) -> Pairing:
    return Pairing(r.id, r.initiator, r.pin, r.expires_at, r.partner, r.status)


def pairing_initiate(db: Session, user: str, now: float) -> Pairing:
    window = cfg()["pairing"]["window_days"] * 86400
    store = PairingStore()
    store.initiations[user] = list(db.scalars(select(LcInitiation.at).where(LcInitiation.user_id == user,
                                                                            LcInitiation.at > now - window)))
    row = store.initiate(user, now)  # PermissionError at the limit
    db.add(_row(row))
    db.add(LcInitiation(user_id=user, at=now))
    db.commit()
    return row


def _load(db: Session, pairing_id: str, lock: bool = False) -> tuple[PairingStore, LcPairing | None]:
    r = db.get(LcPairing, pairing_id, with_for_update=lock)
    store = PairingStore()
    if r is not None:
        store.rows[pairing_id] = _pairing(r)
    return store, r


def _save(db: Session, r: LcPairing, p: Pairing) -> Pairing:
    r.partner, r.status = p.partner, p.status
    db.commit()
    return p


def pairing_confirm(db: Session, pairing_id: str, pin: str, user: str, now: float) -> Pairing:
    store, r = _load(db, pairing_id, lock=True)
    try:
        p = store.confirm(pairing_id, pin, user, now)
    except PermissionError:
        if r is not None and store.rows[pairing_id].status == "expired":
            r.status = "expired"
            db.commit()
        raise
    return _save(db, r, p)


def pairing_revoke(db: Session, pairing_id: str, user: str) -> Pairing:
    store, r = _load(db, pairing_id, lock=True)
    p = store.revoke(pairing_id, user)
    return _save(db, r, p)


def pairing_get(db: Session, pairing_id: str, user: str, now: float) -> Pairing | None:
    r = db.get(LcPairing, pairing_id)
    if r is None or user not in {r.initiator, r.partner}:
        return None
    if r.status == "pending" and now >= r.expires_at:
        r.status = "expired"
        db.commit()
    return _pairing(r)


# lab sample ----------------------------------------------------------------------------------------------------------
def sample_get(db: Session, owner: str, now: float) -> tracking.Sample:
    r = db.get(LcSample, owner)
    if r is None:
        times = {1: now - 4 * 86400, 2: now - 3 * 86400}
        r = LcSample(owner=owner, barcode="DEMO-" + owner[-1].upper(), stage=3, times=json.dumps(times), qc_failure=None)
        db.add(r)
        db.commit()
    return tracking.Sample(r.barcode, r.stage, {int(k): v for k, v in json.loads(r.times).items()}, r.qc_failure)


def sample_save(db: Session, owner: str, s: tracking.Sample) -> None:
    r = db.get(LcSample, owner)
    r.stage, r.times, r.qc_failure = s.stage, json.dumps(s.times), s.qc_failure
    db.commit()


# cascade tokens: single use survives restarts and multiple workers (the nonce is a primary key) -------------------------
class UsedNonces:
    def __init__(self, db: Session) -> None:
        self.db = db

    def __contains__(self, nonce: str) -> bool:
        return self.db.get(LcTokenUse, nonce) is not None

    def add(self, nonce: str) -> None:
        self.db.add(LcTokenUse(nonce=nonce))
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise PermissionError("Token unavailable") from None


# whisper vouchers ----------------------------------------------------------------------------------------------------
def whisper_enqueue(db: Session, contact: str, gene_family: str, now: float) -> None:
    v = WhisperQueue().enqueue(contact, gene_family, now)
    db.add(LcVoucher(code=v.code, phone_sha256=v.phone_sha256, gene_family=v.gene_family, send_at=v.send_at, status=v.status))
    db.commit()


def whisper_due(db: Session, at: float) -> int:
    rows = list(db.scalars(select(LcVoucher).where(LcVoucher.status == "queued", LcVoucher.send_at <= at)))
    for r in rows:
        r.status = "dispatched"
    db.commit()
    return len(rows)


# safe vault ----------------------------------------------------------------------------------------------------------
def vault_get(db: Session, actor: str) -> LcVault | None:
    return db.get(LcVault, actor)


def vault_set(db: Session, actor: str, real_hash: str, decoy_hash: str) -> None:
    r = db.get(LcVault, actor)
    if r is None:
        db.add(LcVault(actor=actor, real_hash=real_hash, decoy_hash=decoy_hash, failures=0))
    else:
        r.real_hash, r.decoy_hash = real_hash, decoy_hash  # failures are kept: reconfiguring cannot clear a lockout
    db.commit()


def vault_fail(db: Session, actor: str) -> None:
    r = db.get(LcVault, actor)
    if r is None:  # failures count even before a vault exists, so guessing cannot be free
        r = LcVault(actor=actor, real_hash="", decoy_hash="", failures=0)
        db.add(r)
    r.failures += 1
    db.commit()


class LcBooking(LifecycleBase):
    __tablename__ = "lc_booking"
    __table_args__ = (Index("lc_booking_one_active_actor", "actor", unique=True,
                            sqlite_where=text("status = 'active'"), postgresql_where=text("status = 'active'")),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    actor: Mapped[str] = mapped_column(String, index=True)
    slot_at: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String)


def booking_active(db: Session, actor: str) -> LcBooking | None:
    return db.scalar(select(LcBooking).where(LcBooking.actor == actor, LcBooking.status == "active"))


def booking_create(db: Session, actor: str, slot_at: int) -> LcBooking:
    row = LcBooking(id=uuid.uuid4().hex, actor=actor, slot_at=slot_at, status="active")
    db.add(row)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        row = booking_active(db, actor)
        if row is None or row.slot_at != slot_at:
            raise ValueError("Active booking already exists") from None
    return row


def booking_cancel(db: Session, actor: str, booking_id: str) -> LcBooking:
    row = db.get(LcBooking, booking_id, with_for_update=True)
    if row is None or row.actor != actor:
        raise PermissionError("Access unavailable")
    row.status = "cancelled"
    return row
