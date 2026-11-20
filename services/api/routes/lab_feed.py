"""Signed synthetic laboratory events and atomic delivery bookkeeping."""


import hmac
import json
import logging
import re
import time
from typing import Annotated, Literal

from fastapi import Depends, HTTPException, Request
from pydantic import Field, TypeAdapter
from sqlalchemy.orm import Session

from services.cohort.fhir import FINDINGS, SYSTEM, TAG
from services.consent import sharing
from services.consent.audit import append_event
from services.consent.policy import Actor, reference
from services.integrations.hl7_lab import decode_event
from services.lifecycle import cfg, store

from ..auth import Identity, secret
from ..schemas import StrictModel
from .fhir_preview import code_from, require_resource
from .pilot import Revision, SandboxIntake, Subject, record_intake

PATH = "/api/integrations/lab/events"
HL7_PATH = "/api/integrations/lab/hl7"
SIGNING_SECRET = "KINSIGHT_LAB_SIGNING_SECRET"  # noqa: S105  the environment variable name, not its value
LAB = Actor("synthetic-lab", "lab")
MAX_BODY_SIZE = 16_384
WINDOW = 300
LOG = logging.getLogger(__name__)


class StageEvent(StrictModel):
    kind: Literal["stage"]
    subject_id: Subject
    stage: Annotated[int, Field(ge=2, le=7)]


class ReportEvent(StrictModel):
    kind: Literal["report"]
    report: SandboxIntake


class BundleEvent(StrictModel):
    kind: Literal["bundle"]
    subject_id: Subject
    revision: Revision
    bundle: dict


EVENT = TypeAdapter(Annotated[StageEvent | ReportEvent | BundleEvent, Field(discriminator="kind")])


def bundle_intake(event: BundleEvent) -> SandboxIntake:
    subject = f"Patient/{event.subject_id}"
    report_id = f"{event.subject_id}-report"
    try:
        bundle = event.bundle
        if bundle.get("resourceType") != "Bundle" or bundle.get("type") != "collection":
            raise ValueError("Expected a FHIR collection Bundle")
        entries = bundle["entry"]
        if not isinstance(entries, list) or not 1 <= len(entries) <= 3:
            raise ValueError("Expected one report with up to two observations")
        resources = [entry["resource"] for entry in entries]
        reports = [resource for resource in resources if resource["resourceType"] == "DiagnosticReport"]
        if len(reports) != 1:
            raise ValueError("Expected exactly one DiagnosticReport")
        report = reports[0].copy()
        require_resource(report, "DiagnosticReport", report_id, subject)
        refs = [item["reference"] for item in report.pop("result", [])]
        observations = {f"Observation/{row['id']}": row for row in resources if row["resourceType"] == "Observation"}
        if len(observations) != len(resources) - 1 or len(refs) != len(set(refs)) or set(refs) != observations.keys():
            raise ValueError("The report must reference all and only its included Observations")
        statuses = {code: status for status, code in FINDINGS.items()}
        findings = {}
        for ref in refs:
            row = observations[ref]
            match = re.fullmatch(r"Observation/([A-Za-z0-9.-]{1,64})", ref)
            if match is None or row.get("status") not in {"preliminary", "final", "amended", "corrected"}:
                raise ValueError("Expected a local Observation reference with a result status")
            require_resource(row, "Observation", match[1], subject)
            condition = code_from(row["code"], f"{SYSTEM}/condition")
            status = statuses.get(code_from(row["valueCodeableConcept"], "http://loinc.org"))
            if condition not in {"COND_001", "COND_002"} or condition in findings or status is None:
                raise ValueError("Unknown or duplicate finding")
            findings[condition] = status
        report["meta"] = {"tag": [TAG]}
    except (AttributeError, KeyError, TypeError) as exc:
        raise ValueError("Invalid FHIR bundle") from exc
    return SandboxIntake(subject_id=event.subject_id, revision=event.revision, resource=report, findings=findings)


def signature(key: bytes, timestamp: str, delivery: str, body: bytes, *, path: str = PATH) -> str:
    return hmac.digest(key, f"POST {path}\n{timestamp}\n{delivery}\n".encode() + body, "sha256").hex()


def audit_rejection(db: Session, code: str) -> None:
    salt = secret("KINSIGHT_AUDIT_SALT")
    append_event(
        db,
        actor_ref=reference(LAB.id, salt),
        action="lab_delivery",
        resource_type="sandbox_report",
        resource_ref=reference(PATH, salt),
        decision="deny",
        reason_code=code,
    )
    db.commit()


def register(app, db_session, limit):
    @app.post(HL7_PATH)
    @app.post(PATH)
    async def receive(request: Request, db: Session = Depends(db_session)):
        stamp = request.headers.get("x-lab-timestamp", "")
        delivery = request.headers.get("x-lab-delivery", "")
        supplied = request.headers.get("x-lab-signature", "")
        now = time.time()
        if (
            not re.fullmatch(r"[0-9]{1,12}", stamp)
            or abs(now - int(stamp)) > WINDOW
            or not re.fullmatch(r"[a-f0-9]{32}", delivery)
            or not re.fullmatch(r"[a-f0-9]{64}", supplied)
        ):
            LOG.warning("lab_auth_denied")
            raise HTTPException(401, "Lab authentication unavailable")
        raw = bytearray()
        async for chunk in request.stream():
            if len(raw) + len(chunk) > MAX_BODY_SIZE:
                raise HTTPException(413, "Lab event is too large")
            raw.extend(chunk)
        body = bytes(raw)
        path = request.url.path
        if not hmac.compare_digest(signature(secret(SIGNING_SECRET), stamp, delivery, body, path=path), supplied):
            LOG.warning("lab_auth_denied")
            raise HTTPException(401, "Lab authentication unavailable")
        limit(db, Identity(LAB, LAB.id, 0))
        nonce = "signed-lab:" + delivery
        if db.get(store.LcTokenUse, nonce) is not None:
            audit_rejection(db, "lab_replayed")
            raise HTTPException(409, "Lab delivery already received")

        try:
            if path == HL7_PATH:
                event = EVENT.validate_python(decode_event(body))
            else:
                event = EVENT.validate_json(body)
                if isinstance(event, BundleEvent):
                    event = ReportEvent(kind="report", report=bundle_intake(event))
            subject = event.subject_id if isinstance(event, StageEvent) else event.report.subject_id
            sample = store.lab_sample(db, subject, for_update=True)
            if isinstance(event, StageEvent):
                if event.stage != sample.stage + 1:
                    raise HTTPException(409, "Lab stage is out of sequence")
                next_stage = event.stage
            else:
                if sample.stage < 7:
                    raise HTTPException(409, "Sample has not finished processing")
                report = record_intake(db, event.report, LAB)
                next_stage = (
                    len(cfg()["lab_stages"]) if report.status in {"final", "amended", "corrected"} else sample.stage
                )
            if next_stage > sample.stage:
                sample.stage = next_stage
                times = json.loads(sample.times)
                times[str(next_stage)] = now
                sample.times = json.dumps(times)
                db.add(sample)
            # shortcut: keep delivery IDs for the sandbox lifetime, add expiry before sustained lab traffic.
            db.add(store.LcTokenUse(nonce=nonce))
            sharing.log_change(db, LAB, subject, "lab_delivery_applied", secret("KINSIGHT_AUDIT_SALT"))
            db.commit()
        except (ValueError, HTTPException):
            db.rollback()
            audit_rejection(db, "lab_event_rejected")
            raise
        return {"stage": sample.stage, "is_synthetic": True}
