"""A realistic synthetic caseload for the counsellor console, drawn from the committed demo cohort (data/demo).

Deterministic (fixed seed) and fictional. Each case is assigned to the demo counsellor with the owner's consent recorded, so
every read still passes the same consent policy as the live demo case.
"""
from __future__ import annotations

import gzip
import hashlib
import json
import random
import time
from pathlib import Path

from sqlalchemy.orm import Session

from services.consent.models import CaseAccess, Consent, Person

DATA = Path(__file__).resolve().parents[2] / "data" / "demo"
COUNSELLOR = "synthetic-counsellor"
SEED = 20261025


def _rows(name: str) -> list[dict]:
    with gzip.open(DATA / f"{name}.jsonl.gz", "rt", encoding="utf-8") as fh:
        return [json.loads(x) for x in fh.read().splitlines()]


def synthetic_cases(n: int = 40) -> list[dict]:
    persons = {p["id"]: p for p in _rows("persons")}
    couples = _rows("couples")
    picks = random.Random(SEED).sample(couples, n)
    out = []
    for c in sorted(picks, key=lambda c: (-c["tier"], c["couple_id"])):
        h = int(hashlib.sha256(c["couple_id"].encode()).hexdigest(), 16)
        tier = c["tier"]
        status = (["awaiting_counsellor"] * 5 + ["released", "awaiting_user", "tracking", "closed"])[h % 9] if tier == 3 else \
                 (["awaiting_user", "tracking", "released", "closed"])[h % 4]
        out.append({"id": c["couple_id"].replace("CPL_", "C-"), "owner": c["person_a"], "tier": tier, "status": status,
                    "due_days": (h % 21) - 6, "language": persons[c["person_a"]]["language"],
                    "related": c["inbreeding_f"] > 0, "conditions": len(c["shared_conditions"])})
    return out


def seed_cases(session: Session) -> None:
    """Idempotent: person, case access and the owner's two consents per case."""
    now = time.time()
    for case in synthetic_cases():
        if session.get(CaseAccess, case["id"]) is not None:
            continue
        owner = "synthetic-" + case["id"].lower()
        if session.get(Person, owner) is None:
            session.add(Person(id=owner, language=case["language"], reading_level="standard", result_viewed_at=now))
        session.add(CaseAccess(id=case["id"], owner_id=owner, assigned_to=COUNSELLOR, assignment_expires_at=4_000_000_000.0,
                               assignment_reason="demo_caseload"))
        for scope, fields in (("couple_summary", ["tier", "id", "due_at", "brief", "referral"]), ("quiz_status", ["id", "status"])):
            session.add(Consent(grantor_id=owner, grantee_id=COUNSELLOR, resource_type="case", resource_id=case["id"], scope=scope,
                                fields=fields, purpose="counselling", expires_at=4_000_000_000.0, text_shown_hash="0" * 64))
    session.commit()
