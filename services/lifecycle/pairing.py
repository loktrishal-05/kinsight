"""FR-004 / OOB-1: ephemeral PIN pairing with a rate limit and one-tap revoke. No result data is held here."""
from __future__ import annotations

import secrets
from dataclasses import dataclass

from . import cfg


@dataclass
class Pairing:
    id: str
    initiator: str
    pin: str
    expires_at: float
    partner: str | None = None
    status: str = "pending"  # pending -> active -> revoked | expired


class PairingStore:
    def __init__(self) -> None:
        self.rows: dict[str, Pairing] = {}
        self.initiations: dict[str, list[float]] = {}

    def initiate(self, user: str, now: float) -> Pairing:
        c = cfg()["pairing"]
        window = c["window_days"] * 86400
        recent = [t for t in self.initiations.get(user, []) if now - t < window]
        if len(recent) >= c["max_per_window"]:
            raise PermissionError("Pairing limit reached")  # anti-probing, PRD section 3.6
        self.initiations[user] = [*recent, now]
        pin = "".join(secrets.choice("0123456789") for _ in range(c["pin_digits"]))
        row = Pairing(secrets.token_hex(8), user, pin, now + c["ttl_seconds"])
        self.rows[row.id] = row
        return row

    def confirm(self, pairing_id: str, pin: str, user: str, now: float) -> Pairing:
        row = self.rows.get(pairing_id)
        if row is None or row.status != "pending" or user == row.initiator:
            raise PermissionError("Pairing unavailable")
        if now >= row.expires_at:
            row.status = "expired"
            raise PermissionError("Pairing unavailable")
        if not secrets.compare_digest(row.pin, pin):
            raise PermissionError("Pairing unavailable")
        row.partner, row.status = user, "active"
        return row

    def revoke(self, pairing_id: str, user: str) -> Pairing:
        row = self.rows.get(pairing_id)
        if row is None or user not in {row.initiator, row.partner}:
            raise PermissionError("Pairing unavailable")
        row.status = "revoked"  # joint view must check active() on every read
        return row

    def active(self, pairing_id: str, user: str) -> bool:
        row = self.rows.get(pairing_id)
        return bool(row and row.status == "active" and user in {row.initiator, row.partner})
