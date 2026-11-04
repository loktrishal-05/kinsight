"""Lifecycle routes (PRD): pairing, lab tracker, certificate countdown, receipt, one-time family link.

Demo state lives in memory per app instance and holds synthetic data only. Every state change is written to the audit chain.
"""

# FastAPI evaluates dependency declarations when registering routes.
# ruff: noqa: B008

import time

from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from services.consent import sharing
from services.lifecycle import cfg, ledger, tracking
from services.lifecycle.cascade import CascadeTokens
from services.lifecycle.pairing import PairingStore

from .auth import secret

PERSON = ("person", "demo_operator")


class Pin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pin: str = Field(pattern=r"^\d{9}$")


class Condition(BaseModel):
    model_config = ConfigDict(extra="forbid")
    condition_id: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9_]+$")


class Token(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(min_length=1, max_length=512)


def register(app, roles, db_session, limit) -> None:
    pairs = PairingStore()
    samples: dict[str, tracking.Sample] = {}
    holder: list[CascadeTokens] = []

    def tokens() -> CascadeTokens:  # lazy: the secret is read at request time, like the other routes
        if not holder:
            holder.append(CascadeTokens(secret("KINSIGHT_TOKEN_SECRET")))
        return holder[0]

    def audit(db: Session, identity, ref: str, action: str) -> None:
        sharing.log_change(db, identity.actor, ref, action, secret("KINSIGHT_AUDIT_SALT"))
        db.commit()

    def sample_of(identity) -> tracking.Sample:
        return samples.setdefault(identity.actor.id, tracking.Sample("DEMO-" + identity.actor.id[-1].upper(), stage=3,
                                  times={1: time.time() - 4 * 86400, 2: time.time() - 3 * 86400}))

    def tracker_view(s: tracking.Sample) -> dict:
        return {"stages": cfg()["lab_stages"], "stage": s.stage, "qc_failure": s.qc_failure,
                "times": {str(k): v for k, v in s.times.items()}}

    @app.get("/api/lifecycle/tracker")
    async def tracker(identity=Depends(roles(*PERSON))):
        return {**tracker_view(sample_of(identity)), "is_synthetic": True}

    @app.post("/api/lifecycle/tracker/advance")
    async def tracker_advance(identity=Depends(roles(*PERSON)), db: Session = Depends(db_session)):
        s = sample_of(identity)
        if s.qc_failure or s.stage >= len(cfg()["lab_stages"]):
            raise HTTPException(409, "Nothing to advance")
        tracking.advance(s, time.time())
        audit(db, identity, s.barcode, "tracker_advance")
        return {**tracker_view(s), "is_synthetic": True}

    @app.get("/api/lifecycle/certificate")
    async def certificate(elapsed_days: int = 30, identity=Depends(roles(*PERSON))):
        elapsed = max(0, min(elapsed_days, 365))
        return {**tracking.certificate_status(0, elapsed * tracking.DAY), "is_synthetic": True}

    @app.post("/api/lifecycle/pairing", status_code=201)
    async def pairing_start(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        limit(db, identity)
        row = pairs.initiate(identity.actor.id, time.time())  # PermissionError -> 403
        audit(db, identity, row.id, "pairing_started")
        return {"id": row.id, "pin": row.pin, "expires_in": cfg()["pairing"]["ttl_seconds"], "is_synthetic": True}

    @app.post("/api/lifecycle/pairing/{id}/confirm")
    async def pairing_confirm(id: str, body: Pin, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        limit(db, identity)
        row = pairs.confirm(id, body.pin, identity.actor.id, time.time())
        audit(db, identity, row.id, "pairing_confirmed")
        return {"status": row.status, "is_synthetic": True}

    @app.post("/api/lifecycle/pairing/{id}/revoke")
    async def pairing_revoke(id: str, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        row = pairs.revoke(id, identity.actor.id)
        audit(db, identity, row.id, "pairing_revoked")
        return {"status": row.status, "is_synthetic": True}

    @app.get("/api/lifecycle/pairing/{id}")
    async def pairing_status(id: str, identity=Depends(roles("person"))):
        row = pairs.rows.get(id)
        if row is None or identity.actor.id not in {row.initiator, row.partner}:
            raise HTTPException(403, "Access unavailable")
        if row.status == "pending" and time.time() >= row.expires_at:
            row.status = "expired"
        return {"status": row.status, "is_synthetic": True}

    @app.get("/api/lifecycle/receipt")
    async def receipt(identity=Depends(roles(*PERSON))):
        # Package-level lines only. The partner's lines are never returned; the other person's share is not computed here.
        mine = identity.actor.id.endswith("b")
        lines = [ledger.line(2650, 80 if mine else 100, 265 if mine else 0), ledger.line(450, 100, 0)]
        led = ledger.Ledger()
        ledger.settle(led, "DEMO-" + identity.actor.id, lines)
        share = sum((ln["copay"] for ln in lines), ledger.money(0))
        labels = ["Carrier screening package", "Counselling session"]
        return {"lines": [{"label": lab, **{k: str(v) for k, v in ln.items()}} for lab, ln in zip(labels, lines)],
                "total": str(sum((ln["gross"] for ln in lines), ledger.money(0))), "your_share": str(share),
                "balanced": led.balanced(), "is_synthetic": True}

    @app.post("/api/lifecycle/cascade", status_code=201)
    async def cascade_mint(body: Condition, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        limit(db, identity)
        audit(db, identity, body.condition_id, "cascade_minted")
        return {"token": tokens().mint(body.condition_id, time.time()), "is_synthetic": True}

    @app.post("/api/lifecycle/cascade/redeem")
    async def cascade_redeem(body: Token, identity=Depends(roles("relative", "person")), db: Session = Depends(db_session)):
        limit(db, identity)
        out = tokens().redeem(body.token, time.time())  # PermissionError -> 403 with no reason
        audit(db, identity, out["condition_id"], "cascade_redeemed")
        return {**out, "is_synthetic": True}
