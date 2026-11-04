"""FR-021 cascade token and OOB-2 Whisper vouchers.

Token: HMAC-signed, 24 h, single use, scoped to ONE condition id; it never carries the sender's name or other results.
(The PRD names AES-256-CBC; a signature over a non-secret scope is enough here and avoids CBC pitfalls.)
Whisper: no field links a voucher to the person who triggered it; send time is uniformly jittered.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import random
import secrets
from dataclasses import dataclass, field

from . import cfg


def _sig(secret: bytes, body: bytes) -> str:
    return hmac.new(secret, body, hashlib.sha256).hexdigest()


class CascadeTokens:
    def __init__(self, secret: bytes) -> None:
        self.secret, self.used = secret, set()

    def mint(self, condition_id: str, now: float) -> str:
        body = json.dumps({"c": condition_id, "e": now + cfg()["cascade"]["ttl_seconds"], "n": secrets.token_hex(8)}).encode()
        return base64.urlsafe_b64encode(body).decode() + "." + _sig(self.secret, body)

    def redeem(self, token: str, now: float) -> dict:
        try:
            raw, sig = token.rsplit(".", 1)
            body = base64.urlsafe_b64decode(raw.encode())
            data = json.loads(body)
        except (ValueError, json.JSONDecodeError):
            raise PermissionError("Token unavailable") from None
        if not hmac.compare_digest(sig, _sig(self.secret, body)) or now >= data["e"] or data["n"] in self.used:
            raise PermissionError("Token unavailable")  # one answer for bad, expired and used
        self.used.add(data["n"])
        return {"condition_id": data["c"]}  # nothing else about the sender


@dataclass
class Voucher:
    code: str
    phone_sha256: str
    gene_family: str
    send_at: float
    status: str = "queued"


@dataclass
class WhisperQueue:
    rows: list[Voucher] = field(default_factory=list)  # deliberately no proband / person id column

    def enqueue(self, phone: str, gene_family: str, now: float, rng: random.Random | None = None) -> Voucher:
        c, r = cfg()["whisper"], rng or random.SystemRandom()
        delay = r.uniform(c["jitter_min_hours"], c["jitter_max_hours"]) * 3600
        v = Voucher(secrets.token_hex(8).upper(), hashlib.sha256(phone.encode()).hexdigest(), gene_family, now + delay)
        self.rows.append(v)
        return v

    def due(self, now: float) -> list[Voucher]:
        out = [v for v in self.rows if v.status == "queued" and v.send_at <= now]
        for v in out:
            v.status = "dispatched"
        return out
