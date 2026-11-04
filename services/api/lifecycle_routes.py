"""Synthetic lifecycle routes for pairing, tracking, triage, counselling safety and demo operations.

State is stored through services/lifecycle/store.py (Postgres via DATABASE_URL, SQLite locally) and holds synthetic data only. Every state change is written to the audit chain.
"""

# FastAPI evaluates dependency declarations when registering routes.
# ruff: noqa: B008

import time
from typing import Annotated, Literal

from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.orm import Session

from services.consent import sharing
from services.lifecycle import cfg, clinvar, gnomad, ledger, safety, store, tracking, triage
from services.lifecycle.cascade import CascadeTokens

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


class LifecycleBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


Identifier = Annotated[str, Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_.:>-]+$")]
Class = Annotated[int, Field(ge=1, le=5)]
VaultDigits = Annotated[str, Field(min_length=4, max_length=8, pattern=r"^[0-9]+$")]


class GeneCall(LifecycleBody):
    gene: Identifier
    inheritance: Literal["AR", "XLR"]
    zygosity: Literal["HET", "HOM", "HEMI"]
    acmg_class: Class
    requires_orthogonal: bool = False
    orthogonal_verified: bool = False
    allele: str = Field(default="", max_length=64, pattern=r"^[A-Za-z0-9_.:>+-]*$")


class Triage(LifecycleBody):
    a: list[GeneCall] = Field(max_length=200)
    b: list[GeneCall] = Field(max_length=200)
    phi: float = Field(ge=0, le=0.5)
    pregnant_days: int | None = Field(default=None, ge=0, le=300)
    dcs: float | None = Field(default=None, ge=0, le=100)
    teach_back_failures: int = Field(default=0, ge=0, le=10)


class Whisper(LifecycleBody):
    contact: str = Field(min_length=7, max_length=21, pattern=r"^\+?[0-9]{7,20}$")
    gene_family: str = Field(min_length=1, max_length=64, pattern=r"^[A-Z0-9_]+$")


class Dispatch(LifecycleBody):
    advance_hours: int = Field(ge=0, le=100)


class Checkin(LifecycleBody):
    instrument: Literal["dcs", "low_literacy_dcs", "pagis"]
    answers: list[Annotated[int, Field(ge=0, le=4)] | Literal["yes", "unsure", "no"]] | None = Field(
        default=None, min_length=1, max_length=16)
    total: float | None = Field(default=None, ge=0, le=200)

    @model_validator(mode="after")
    def valid_instrument(self):
        if self.instrument == "pagis":
            valid = self.total is not None and self.answers is None
        elif self.instrument == "dcs":
            valid = self.total is None and self.answers is not None and all(type(a) is int for a in self.answers)
        else:
            valid = (self.total is None and self.answers is not None and len(self.answers) == 10
                     and all(isinstance(a, str) for a in self.answers))
        if not valid:
            raise ValueError("Invalid instrument input")
        return self


class Reclassify(LifecycleBody):
    archived: dict[Identifier, Class] = Field(max_length=200)
    feed: dict[Identifier, Class] = Field(max_length=200)


class VaultPin(LifecycleBody):
    pin: VaultDigits


class SafeVault(VaultPin):
    decoy_pin: VaultDigits

    @model_validator(mode="after")
    def different_pins(self):
        if self.pin == self.decoy_pin:
            raise ValueError("PINs must differ")
        return self


class Tamm(LifecycleBody):
    pairing_ref: Identifier
    role: Literal["pcp", "counsellor"]


class BreakGlass(LifecycleBody):
    attestors: list[Identifier] = Field(min_length=1, max_length=4)
    reason: str = Field(min_length=1, max_length=300)


def register(app, roles, db_session, limit) -> None:
    def tokens(db: Session) -> CascadeTokens:  # secret read at request time; single-use nonces live in the database
        t = CascadeTokens(secret("KINSIGHT_TOKEN_SECRET"))
        t.used = store.UsedNonces(db)
        return t

    def audit(db: Session, identity, ref: str, action: str) -> None:
        sharing.log_change(db, identity.actor, ref, action, secret("KINSIGHT_AUDIT_SALT"))
        db.commit()

    def sample_of(db: Session, identity) -> tracking.Sample:
        return store.sample_get(db, identity.actor.id, time.time())

    def tracker_view(s: tracking.Sample) -> dict:
        return {"stages": cfg()["lab_stages"], "stage": s.stage, "qc_failure": s.qc_failure,
                "times": {str(k): v for k, v in s.times.items()}}

    @app.post("/api/lifecycle/triage")
    async def triage_evaluate(body: Triage, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        out = triage.evaluate([triage.GeneCall(**c.model_dump()) for c in body.a],
                              [triage.GeneCall(**c.model_dump()) for c in body.b], body.phi,
                              pregnant_days=body.pregnant_days, dcs=body.dcs,
                              teach_back_failures=body.teach_back_failures)
        audit(db, identity, "triage", "triage_evaluated")
        return {**out, "is_synthetic": True}

    @app.post("/api/lifecycle/whisper")
    async def whisper(body: Whisper, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        limit(db, identity)
        audit(db, identity, "whisper", "whisper_queued")  # No voucher reference links the audit actor to a row.
        store.whisper_enqueue(db, body.contact, body.gene_family, time.time())
        return {"status": "queued"}

    @app.post("/api/lifecycle/whisper/dispatch")
    async def whisper_dispatch(body: Dispatch, identity=Depends(roles("demo_operator")),
                               db: Session = Depends(db_session)):
        audit(db, identity, "whisper", "whisper_dispatched")
        return {"dispatched": store.whisper_due(db, time.time() + body.advance_hours * 3600)}

    @app.post("/api/lifecycle/checkin")
    async def checkin(body: Checkin, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        limit(db, identity)
        if body.instrument == "pagis":
            score, flagged = body.total, safety.pagis_flag(body.total)
        else:
            score = (safety.dcs_score(body.answers) if body.instrument == "dcs"
                     else safety.low_literacy_dcs(body.answers))
            flagged = safety.dcs_flag(score)
        audit(db, identity, "checkin", "checkin_recorded")
        return {"score": score, "flagged": flagged, "support_offered": flagged}

    @app.post("/api/lifecycle/reclassify")
    async def reclassify(body: Reclassify, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        out = safety.reclassification(body.archived, body.feed)
        audit(db, identity, "reclassification", "reclassification_checked")
        return {"alerts": out}

    @app.put("/api/lifecycle/safe-vault")
    async def safe_vault(body: SafeVault, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        limit(db, identity)
        hashes = safety.hash_pin(body.pin), safety.hash_pin(body.decoy_pin)
        audit(db, identity, "safe-vault", "safe_vault_configured")
        store.vault_set(db, identity.actor.id, *hashes)
        return {"status": "configured"}

    @app.post("/api/lifecycle/safe-vault/unlock")
    async def vault_unlock(body: VaultPin, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        limit(db, identity)
        actor = identity.actor.id
        vault = store.vault_get(db, actor)
        if vault is not None and vault.failures >= 5:
            audit(db, identity, "safe-vault", "safe_vault_limited")
            raise HTTPException(429, "Request limit reached")
        view = safety.check_pins(body.pin, vault.real_hash, vault.decoy_hash) if vault and vault.real_hash else "none"
        if view == "none":
            store.vault_fail(db, actor)
            audit(db, identity, "safe-vault", "safe_vault_refused")
            raise PermissionError("Access unavailable")
        audit(db, identity, "safe-vault", "safe_vault_unlocked")
        return {"view": view}

    @app.post("/api/lifecycle/tamm")
    async def tamm(body: Tamm, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        out = safety.tamm_attestation(body.pairing_ref, body.role, time.time())
        audit(db, identity, body.pairing_ref, "tamm_attested")
        return {**out, "is_synthetic": True}

    @app.post("/api/lifecycle/break-glass")
    async def break_glass(body: BreakGlass, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        try:
            out = safety.break_glass(body.attestors, body.reason)
        except PermissionError:
            audit(db, identity, "break-glass", "break_glass_refused")
            raise
        audit(db, identity, "break-glass", "break_glass_granted")
        return {**out, "is_synthetic": True}

    @app.get("/api/lifecycle/tracker")
    async def tracker(identity=Depends(roles(*PERSON)), db: Session = Depends(db_session)):
        return {**tracker_view(sample_of(db, identity)), "is_synthetic": True}

    @app.post("/api/lifecycle/tracker/advance")
    async def tracker_advance(identity=Depends(roles(*PERSON)), db: Session = Depends(db_session)):
        s = sample_of(db, identity)
        if s.qc_failure or s.stage >= len(cfg()["lab_stages"]):
            raise HTTPException(409, "Nothing to advance")
        tracking.advance(s, time.time())
        store.sample_save(db, identity.actor.id, s)
        audit(db, identity, s.barcode, "tracker_advance")
        return {**tracker_view(s), "is_synthetic": True}

    @app.get("/api/lifecycle/certificate")
    async def certificate(elapsed_days: int = 30, identity=Depends(roles(*PERSON))):
        elapsed = max(0, min(elapsed_days, 365))
        return {**tracking.certificate_status(0, elapsed * tracking.DAY), "is_synthetic": True}

    @app.post("/api/lifecycle/pairing", status_code=201)
    async def pairing_start(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        limit(db, identity)
        row = store.pairing_initiate(db, identity.actor.id, time.time())  # PermissionError -> 403
        audit(db, identity, row.id, "pairing_started")
        return {"id": row.id, "pin": row.pin, "expires_in": cfg()["pairing"]["ttl_seconds"], "is_synthetic": True}

    @app.post("/api/lifecycle/pairing/{id}/confirm")
    async def pairing_confirm(id: str, body: Pin, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        limit(db, identity)
        row = store.pairing_confirm(db, id, body.pin, identity.actor.id, time.time())
        audit(db, identity, row.id, "pairing_confirmed")
        return {"status": row.status, "is_synthetic": True}

    @app.post("/api/lifecycle/pairing/{id}/revoke")
    async def pairing_revoke(id: str, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        row = store.pairing_revoke(db, id, identity.actor.id)
        audit(db, identity, row.id, "pairing_revoked")
        return {"status": row.status, "is_synthetic": True}

    @app.get("/api/lifecycle/pairing/{id}")
    async def pairing_status(id: str, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        row = store.pairing_get(db, id, identity.actor.id, time.time())
        if row is None:
            raise HTTPException(403, "Access unavailable")
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
        return {"token": tokens(db).mint(body.condition_id, time.time()), "is_synthetic": True}

    @app.post("/api/lifecycle/cascade/redeem")
    async def cascade_redeem(body: Token, identity=Depends(roles("relative", "person")), db: Session = Depends(db_session)):
        limit(db, identity)
        out = tokens(db).redeem(body.token, time.time())  # PermissionError -> 403 with no reason
        audit(db, identity, out["condition_id"], "cascade_redeemed")
        return {**out, "is_synthetic": True}

    class LiveCheck(BaseModel):
        model_config = ConfigDict(extra="forbid")
        archived: dict[str, int] = Field(min_length=1, max_length=clinvar.MAX_IDS)  # ClinVar variation id -> class on the report

    @app.post("/api/lifecycle/reclassify/live")
    async def reclassify_live(body: LiveCheck, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        """Compare the classes on file with ClinVar right now. Only variation ids are sent to NCBI."""
        if any(not 1 <= v <= 5 or not k.isdigit() for k, v in body.archived.items()):
            raise HTTPException(422, "Invalid request")
        limit(db, identity)
        try:
            live = clinvar.fetch(list(body.archived))
        except clinvar.SourceUnavailable:
            raise HTTPException(503, "Live source unavailable") from None
        feed = {k: v["acmg_class"] for k, v in live.items() if v["acmg_class"]}
        audit(db, identity, "clinvar", "reclassify_live")
        return {"alerts": safety.reclassification(body.archived, feed), "checked": len(live),
                "source": "NCBI ClinVar", "classes": live, "is_synthetic": False}

    class Frequencies(BaseModel):
        model_config = ConfigDict(extra="forbid")
        variants: list[Annotated[str, Field(pattern=gnomad.ID.pattern)]] = Field(min_length=1, max_length=gnomad.MAX_IDS)

    @app.post("/api/lifecycle/frequency")
    async def frequency(body: Frequencies, identity=Depends(roles("counsellor", "analyst")),
                        db: Session = Depends(db_session)):
        """Live gnomAD allele frequencies. Only variant ids are sent; not an Emirati cohort (see module note)."""
        limit(db, identity)
        try:
            found = gnomad.fetch(body.variants)
        except gnomad.SourceUnavailable:
            raise HTTPException(503, "Live source unavailable") from None
        audit(db, identity, "gnomad", "frequency_live")
        return {"variants": found, "source": "gnomAD v4", "is_synthetic": False}
