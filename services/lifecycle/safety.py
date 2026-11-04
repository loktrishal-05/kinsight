"""Instruments (FR-012/013/023/024/029), reclassification alerts (FR-022), decoy PIN (OOB-3), TAMM attestation (FR-020),
break-glass (FR-030).

Instrument ITEM TEXT is not reproduced: DCS, PAGIS and RGCS-DA are published scales with their own permissions. This
module only scores answers that a licensed item set supplies.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets

from . import cfg


def dcs_score(answers: list[int]) -> float:
    """Decisional Conflict Scale: items 0 (strongly agree) .. 4 (strongly disagree); score = mean * 25 (0-100)."""
    if not answers or any(not 0 <= x <= 4 for x in answers):
        raise ValueError("Invalid answers")
    return round(sum(answers) / len(answers) * 25, 1)


def low_literacy_dcs(answers: list[str]) -> float:
    """10-item yes / unsure / no form: yes = 0, unsure = 50, no = 100 per item, averaged."""
    pts = {"yes": 0, "unsure": 50, "no": 100}
    if len(answers) != 10 or any(x not in pts for x in answers):
        raise ValueError("Invalid answers")
    return sum(pts[x] for x in answers) / 10


def pagis_flag(total: float) -> bool:
    """Waiting-period check-in: a LOW total (below the configured cut-off) asks for psychosocial support."""
    return total < cfg()["instruments"]["pagis_flag_below"]


def dcs_flag(score: float) -> bool:
    return score > cfg()["instruments"]["dcs_flag_above"]


def reclassification(archived: dict[str, int], feed: dict[str, int]) -> list[dict]:
    """Alerts for variants whose ACMG class moved across the 4/5 line since the report was issued."""
    out = []
    for variant, old in archived.items():
        new = feed.get(variant, old)
        if (old in (4, 5)) != (new in (4, 5)):
            out.append({"variant": variant, "from": old, "to": new,
                        "direction": "upgraded" if new in (4, 5) else "downgraded", "needs_clinician_review": True})
    return out


def hash_pin(pin: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    return salt.hex() + ":" + hashlib.scrypt(pin.encode(), salt=salt, n=2**14, r=8, p=1).hex()


def check_pins(pin: str, real_hash: str, decoy_hash: str) -> str:
    """Return 'real', 'decoy' or 'none'. A decoy PIN opens a benign view; both hashes are always checked."""
    def ok(h: str) -> bool:
        salt, digest = h.split(":")
        return hmac.compare_digest(hashlib.scrypt(pin.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1).hex(), digest)
    real, decoy = ok(real_hash), ok(decoy_hash)
    return "real" if real else "decoy" if decoy else "none"


def tamm_attestation(pairing_ref: str, signed_off_by: str, issued_at: float) -> dict:
    """Attendance and completion only. The key allow-list is fixed so no genetic field can be added by accident."""
    return {"pairing_ref": pairing_ref, "screening_completed": True, "counselling_completed": True,
            "signed_off_by_role": signed_off_by, "issued_at": issued_at}


TAMM_KEYS = frozenset(tamm_attestation("", "", 0))


def break_glass(attestors: list[str], reason: str) -> dict:
    """Two distinct clinicians and a stated emergency reason; the caller must raise the alert and log to the citizen."""
    if len(set(attestors)) < 2 or not reason.strip():
        raise PermissionError("Dual attestation required")
    return {"granted": True, "attestors": sorted(set(attestors)), "alert_siem": True, "notify_citizen": True}
