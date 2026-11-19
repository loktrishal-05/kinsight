"""The counsellor-approved FHIR delivery path for the synthetic demo case."""

import time
from typing import Literal

import httpx
from fastapi import Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from services.agents.referral import NEXT
from services.consent import sharing
from services.consent.models import Consent
from services.consent.policy import reference
from services.integrations import fhir_referral

from .auth import secret
from .backend import CASE
from .schemas import Alias

BASE_ENV = "KINSIGHT_FHIR_REFERRAL_URL"


def register(app, *, backend, base_url, db_session, roles, case_check, limit):
    def exchange(action, key, referral, subject):
        try:
            with httpx.Client(base_url=base_url.rstrip("/") + "/", timeout=5, trust_env=False,
                              headers={"accept": "application/fhir+json", "content-type": "application/fhir+json"}) as client:
                if action == "send":
                    remote = fhir_referral.submit(client, key=key, subject=subject, stage=referral.state,
                                                  due=referral.due.isoformat())
                    if remote is None:
                        raise ValueError("Referral missing after transaction")
                    return remote
                return fhir_referral.status(client, key)
        except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
            raise HTTPException(502, "The synthetic referral could not be verified") from None

    @app.post("/api/counsellor/cases/{id}/referral/fhir/{action}")
    async def deliver(id: Alias, action: Literal["send", "sync"],
                      identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        decision = case_check(db, identity, id, {"referral_delivery"}, True)
        if id != CASE:
            raise HTTPException(404, "Synthetic referral unavailable")
        if action == "send":
            limit(db, identity)
        salt = secret("KINSIGHT_AUDIT_SALT")
        referral = backend.fhir_referral_state()
        instance = backend.referral_instance
        stage = referral.state
        if action == "sync" and len(referral.events) >= 2 and (
            referral.events[-1].evidence or ""
        ).startswith("Task/"):
            stage = referral.events[-2].to_state
        if stage not in fhir_referral.SERVICES:
            if action == "sync":
                return {"state": "waiting", "is_synthetic": True}
            raise HTTPException(409, "An approved referral stage is required")
        key = reference(f"referral:{instance}:{stage}", salt)
        subject = reference(f"referral-subject:{instance}", salt)
        remote = await run_in_threadpool(exchange, action, key, referral, subject)
        now = time.time()
        grants = [db.get(Consent, grant, populate_existing=True) for grant in decision.consent_ids]
        if not any(grant and grant.revoked_at is None and grant.expires_at > now for grant in grants):
            raise HTTPException(403, "Access unavailable")
        if instance != backend.referral_instance or referral.state != backend.fhir_referral_state().state:
            raise HTTPException(409, "The referral stage changed")
        if not remote:
            return {"state": "waiting", "is_synthetic": True}
        if remote["status"] == "completed" and stage == referral.state:
            await backend.invoke("referral_event", id, {
                "event": NEXT[referral.state], "evidence_code": f"Task/{remote['task_id']}",
            }, db)
            sharing.log_change(db, identity.actor, id, "fhir_referral_completed", salt)
        elif action == "send":
            sharing.log_change(db, identity.actor, id, "fhir_referral_sent", salt)
        db.commit()
        return {"state": remote["status"], **remote, "synced_at": now, "is_synthetic": True}
