"""Version-bound import and review for the seeded FHIR sandbox."""

import hashlib
import hmac
import json
import re
import time
from datetime import datetime
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException
from pydantic import AwareDatetime, Field, TypeAdapter
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from services.cohort.fhir import FINDINGS, SYSTEM, TAG
from services.cohort.panel import load_panel
from services.consent import sharing
from services.consent.models import Consent, Person
from services.consent.policy import ResourceRef
from services.integrations.fhir_client import read_json
from services.lifecycle import review as review_queue
from services.lifecycle.store import FhirImport

from ..auth import secret
from ..schemas import StrictModel
from .pilot import Subject

BASE_ENV = "KINSIGHT_FHIR_SANDBOX_URL"
ASSIGNED = {
    "synthetic-a": "ks-demo-b2562112-399d-497d-a2ea-9a9d491db685",
    "synthetic-b": "ks-demo-66aa9ecf-d459-469e-8aa2-130d6dd3943b",
}
ISSUED = TypeAdapter(AwareDatetime)
RESOURCE = "fhir_import"
REVIEWER = "synthetic-counsellor"
CONSENT_TEXT = "Save this synthetic report and share this version with the demo counsellor for one hour."


class SnapshotRequest(StrictModel):
    snapshot_id: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


def require_resource(resource, kind, resource_id, subject=None):
    if (
        resource.get("resourceType") != kind
        or resource.get("id") != resource_id
        or TAG not in resource.get("meta", {}).get("tag", [])
        or (subject is not None and resource.get("subject", {}).get("reference") != subject)
    ):
        raise ValueError("FHIR resource does not match the assigned fixture")


def code_from(concept, system):
    codes = [item["code"] for item in concept.get("coding", []) if item.get("system") == system]
    return codes[0] if len(codes) == 1 else None


def read_preview(client: httpx.Client, patient_id: str, panel, *, for_review=False) -> dict:
    subject = f"Patient/{patient_id}"
    require_resource(read_json(client, subject), "Patient", patient_id)
    bundle = read_json(client, "DiagnosticReport", params={
        "_id": patient_id, "subject": subject, "_include": "DiagnosticReport:result",
    })
    if bundle.get("resourceType") != "Bundle" or bundle.get("type") != "searchset" or any(
        item.get("relation") == "next" for item in bundle.get("link", [])
    ):
        raise ValueError("Expected a complete FHIR search bundle")
    resources = {}
    for item in bundle.get("entry", []):
        resource = item["resource"]
        key = (resource["resourceType"], resource["id"])
        if key in resources:
            raise ValueError("Duplicate FHIR search resource")
        resources[key] = resource

    if not resources:
        return {"state": "missing", "findings": []}
    report = resources.pop(("DiagnosticReport", patient_id))
    require_resource(report, "DiagnosticReport", patient_id, subject)
    for (kind, observation_id), observation in resources.items():
        require_resource(observation, "Observation", observation_id, subject)
        if kind != "Observation":
            raise ValueError("Unexpected FHIR search resource")
    status = report["status"]
    if status not in {"final", "amended", "corrected"}:
        return {"state": "unavailable", "findings": []}
    version = report["meta"]["versionId"]
    if not isinstance(version, str) or not re.fullmatch(r"[A-Za-z0-9.\-]{1,64}", version):
        raise ValueError("Expected a FHIR server version")
    if not isinstance(report.get("issued"), str):
        raise ValueError("Expected a FHIR report issuance time")
    issued: datetime = ISSUED.validate_python(report["issued"])
    summary = {"report_id": patient_id, "version": version, "issued_at": issued.isoformat(), "status": status}
    if code_from(report["code"], f"{SYSTEM}/panel") != panel.panel_version:
        return {**summary, "state": "requires_review", "unmapped": True, "findings": []}

    panel_ids = {condition.id for condition in panel.conditions}
    statuses = {code: finding for finding, code in FINDINGS.items()}
    findings = {}
    unmapped_sources = set()
    result = report.get("result", [])
    if not result or len(result) != len(resources):
        raise ValueError("The FHIR report is missing its referenced observations")
    for item in result:
        match = re.fullmatch(r"Observation/([A-Za-z0-9.\-]{1,64})", item["reference"])
        if not match:
            raise ValueError("Expected an Observation reference on this server")
        observation_id = match[1]
        observation = resources.pop(("Observation", observation_id))
        target = [
            code_from(component.get("valueCodeableConcept", {}), f"{SYSTEM}/condition")
            for component in observation.get("component", [])
            if code_from(component["code"], f"{SYSTEM}/component") == "synthetic-screening-target"
        ]
        finding = statuses.get(code_from(observation.get("valueCodeableConcept", {}), "http://loinc.org"))
        if (
            len(target) != 1 or target[0] not in panel_ids or target[0] in findings
            or finding is None
            or observation["status"] not in {"final", "amended", "corrected"}
            or code_from(observation["code"], "http://loinc.org") != "69548-6"
        ):
            unmapped_sources.add(observation_id)
            continue
        findings[target[0]] = {"condition_id": target[0], "status": finding, "source_id": observation_id}
    if unmapped_sources:
        return {**summary, "state": "requires_review", "unmapped": True, "findings": [],
                "unmapped_source_ids": sorted(unmapped_sources)}
    visible = [finding for finding in findings.values() if finding["status"] != "uncertain"]
    state = "ready" if len(visible) == len(findings) else "requires_review"
    if for_review:
        return {**summary, "state": state, "findings": sorted(findings.values(), key=lambda item: item["source_id"])}
    return {**summary, "state": state, "findings": visible}


def register(app, *, base_url, db_session, roles, own, check, limit):
    panel = load_panel()
    source = base_url.rstrip("/") + "/"

    def fetch(subject):
        patient_id = ASSIGNED.get(subject)
        if patient_id is None:
            raise HTTPException(404, "Synthetic FHIR fixture unavailable")
        try:
            with httpx.Client(
                base_url=source, timeout=5, trust_env=False, headers={"accept": "application/fhir+json"},
            ) as client:
                return read_preview(client, patient_id, panel, for_review=True)
        except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
            raise HTTPException(502, "The synthetic FHIR report could not be verified") from None

    def snapshot_id(subject, report):
        payload = json.dumps([source, subject, report], sort_keys=True, separators=(",", ":"))
        return hmac.digest(secret("KINSIGHT_AUDIT_SALT"), b"fhir-import\0" + payload.encode(), hashlib.sha256).hex()

    def active_consent(consent_id):
        return select(Consent.id).where(
            Consent.id == consent_id, Consent.revoked_at.is_(None), Consent.expires_at > time.time(),
        )

    def current(db, subject):
        row = db.get(FhirImport, subject, populate_existing=True)
        if row is None:
            return None, None, "missing"
        report = fetch(subject)
        row = db.get(FhirImport, subject, populate_existing=True)
        if row is None:
            return None, None, "missing"
        if snapshot_id(subject, report) != row.snapshot_id:
            return row, None, "stale"
        return row, json.loads(row.payload), "released" if row.approved else "pending"

    @app.post("/api/me/imports/fhir")
    @app.post("/api/me/imports/fhir/preview", include_in_schema=False)
    def preview(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, RESOURCE, {"status", "brief"})
        limit(db, identity)
        subject = identity.actor.id
        report = fetch(subject)
        findings = [finding for finding in report["findings"] if finding["status"] != "uncertain"]
        result = {**report, "findings": findings, "is_synthetic": True}
        if report.get("version"):
            result["snapshot_id"] = snapshot_id(subject, report)
        return result

    @app.post("/api/me/imports/fhir/confirm", status_code=204)
    def confirm(body: SnapshotRequest, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, RESOURCE, {"status", "brief"})
        limit(db, identity)
        subject = identity.actor.id
        if db.get(Person, subject, populate_existing=True, with_for_update=True) is None:
            raise HTTPException(404, "Synthetic profile not found")
        report = fetch(subject)
        if not report.get("version") or snapshot_id(subject, report) != body.snapshot_id:
            raise HTTPException(409, "Source changed. Load the latest version before confirming.")
        row = db.get(FhirImport, subject, populate_existing=True)
        if row is not None:  # noqa: SIM102  the inner branch revokes after its own early return
            if db.scalar(active_consent(row.consent_id)):
                if row.snapshot_id == body.snapshot_id:
                    return
                sharing.revoke(db, identity.actor, row.consent_id, secret("KINSIGHT_AUDIT_SALT"))
        consent = sharing.grant(
            db, identity.actor, grantee_id=REVIEWER, resource_type=RESOURCE, resource_id=subject,
            scope="fhir_import_review", fields=["brief"], purpose="counselling",
            expires_at=time.time() + 3600, text_shown=CONSENT_TEXT, salt=secret("KINSIGHT_AUDIT_SALT"),
        )
        if row is None:
            row = FhirImport(subject_id=subject)
            db.add(row)
        row.snapshot_id = body.snapshot_id
        row.payload = json.dumps(report)
        row.approved = False
        row.consent_id = consent.id
        review_queue.enqueue(db, "fhir_import", subject, body.snapshot_id)
        sharing.log_change(db, identity.actor, subject, "fhir_import_confirmed", secret("KINSIGHT_AUDIT_SALT"))
        db.commit()

    def personal_status(db, identity, import_id=None):
        own(db, identity, RESOURCE, {"status", "brief"})
        subject = identity.actor.id
        if import_id is not None:
            saved = db.get(FhirImport, subject, populate_existing=True)
            if saved is None or saved.snapshot_id != import_id:
                raise HTTPException(404, "Synthetic import unavailable")
        row, report, state = current(db, subject)
        if import_id is not None and (row is None or row.snapshot_id != import_id):
            raise HTTPException(404, "Synthetic import unavailable")
        if state == "pending" and not db.scalar(active_consent(row.consent_id)):
            state = "sharing_ended"
        return {"state": state, "report": report if state == "released" else None, "is_synthetic": True}

    @app.get("/api/me/imports/fhir", include_in_schema=False)
    def personal(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        return personal_status(db, identity)

    @app.get("/api/me/imports/{import_id}")
    def import_status(import_id: str, identity=Depends(roles("person")), db: Session = Depends(db_session)):
        return personal_status(db, identity, import_id)

    def review_access(db, identity, subject):
        return check(
            db, identity, ResourceRef(
                RESOURCE, subject, subject, owner_viewed=True, assigned_to=REVIEWER,
                assignment_expires_at=4_000_000_000.0, assignment_reason="fhir_import_review",
            ), {"brief"}, "counselling", True,
        )

    @app.get("/api/counsellor/fhir-imports/{subject}")
    def review(subject: Subject, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        decision = review_access(db, identity, subject)
        row, report, state = current(db, subject)
        if row is None or row.consent_id not in decision.consent_ids or not db.scalar(active_consent(row.consent_id)):
            raise HTTPException(403, "Access unavailable")
        return {
            "state": state, "report": report, "snapshot_id": row.snapshot_id,
            "can_approve": state == "pending" and bool(report and report["findings"]), "is_synthetic": True,
        }

    @app.post("/api/counsellor/fhir-imports/{subject}/approve", status_code=204)
    def approve(subject: Subject, body: SnapshotRequest, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        decision = review_access(db, identity, subject)
        limit(db, identity)
        row, report, state = current(db, subject)
        if row is None or row.consent_id not in decision.consent_ids:
            raise HTTPException(403, "Access unavailable")
        if state == "stale" or row.snapshot_id != body.snapshot_id or not report or not report["findings"]:
            raise HTTPException(409, "A current mapped report is required for approval.")
        if state == "released" and db.scalar(active_consent(row.consent_id)):
            return
        changed = db.execute(update(FhirImport).where(
            FhirImport.subject_id == subject, FhirImport.snapshot_id == body.snapshot_id,
            FhirImport.consent_id == row.consent_id, FhirImport.approved.is_(False),
            active_consent(row.consent_id).exists(),
        ).values(approved=True))
        if not changed.rowcount:
            raise HTTPException(409, "The report or review consent changed.")
        review_queue.resolve(db, "fhir_import", body.snapshot_id)
        sharing.log_change(db, identity.actor, subject, "fhir_import_approved", secret("KINSIGHT_AUDIT_SALT"))
        db.commit()
