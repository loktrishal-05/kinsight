"""Opt-in lab intake and review for the two fictional demo participants."""

# FastAPI evaluates dependency declarations when registering routes.

import time
from typing import Annotated, Literal

from fastapi import Depends, HTTPException, Response
from pydantic import Field
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, aliased

from services.consent import sharing
from services.consent.models import Consent
from services.consent.policy import Actor, ResourceRef
from services.lifecycle import review as review_queue
from services.lifecycle.store import SandboxReport

from .auth import secret
from .pilot_reports import FindingStatus, ReportRevision, ScreeningReport, current_report, from_synthetic_fhir
from .schemas import StrictModel

Subject = Literal["synthetic-a", "synthetic-b"]
Revision = Annotated[int, Field(ge=1, le=1_000_000)]


class FhirSubject(StrictModel):
    reference: Literal["Patient/synthetic-a", "Patient/synthetic-b"]


class FhirTag(StrictModel):
    system: Literal["https://kinsight.example/tags"]
    code: Literal["synthetic"]


class FhirMeta(StrictModel):
    tag: Annotated[list[FhirTag], Field(min_length=1, max_length=1)]


class FhirCode(StrictModel):
    text: Literal["Synthetic carrier screen"]


class SandboxDiagnosticReport(StrictModel):
    resourceType: Literal["DiagnosticReport"]  # noqa: N815  FHIR field name
    id: Literal["synthetic-a-report", "synthetic-b-report"]
    subject: FhirSubject
    meta: FhirMeta
    code: FhirCode
    status: Annotated[str, Field(max_length=20)]
    issued: Annotated[str, Field(max_length=40)]


class SandboxIntake(StrictModel):
    subject_id: Subject
    revision: Revision
    resource: SandboxDiagnosticReport
    findings: Annotated[dict[Literal["COND_001", "COND_002"], FindingStatus], Field(max_length=2)]


class Approval(StrictModel):
    revision: Revision


def latest(db: Session, subject_id: str) -> SandboxReport | None:
    return db.scalar(
        select(SandboxReport)
        .where(SandboxReport.subject_id == subject_id)
        .order_by(SandboxReport.revision.desc())
        .limit(1)
    )


def record_intake(db: Session, body: SandboxIntake, actor: Actor) -> ScreeningReport:
    report = from_synthetic_fhir(
        body.resource.model_dump(), subject_id=body.subject_id, revision=body.revision,
        panel_version="synthetic-panel-v1", findings=body.findings,
    )
    if report.report_id != f"{body.subject_id}-report":
        raise ValueError("Report does not match the assigned sandbox stream")
    row = db.get(SandboxReport, (body.subject_id, body.revision))
    if row is not None:
        if ScreeningReport.model_validate_json(row.payload) != report:
            raise HTTPException(409, "Conflicting report revision")
    else:
        db.add(SandboxReport(subject_id=body.subject_id, revision=body.revision, payload=report.model_dump_json()))
        sharing.log_change(db, actor, report.report_id, "sandbox_lab_received", secret("KINSIGHT_AUDIT_SALT"))
    return report


def register(app, *, db_session, roles, check, own, limit, signed_feed=False):
    @app.post("/api/sandbox/lab/reports")
    def intake(body: SandboxIntake, identity=Depends(roles("demo_operator")), db: Session = Depends(db_session)):
        if signed_feed:
            raise HTTPException(403, "Use the signed lab feed")
        check(db, identity, ResourceRef("demo", "sandbox-intake"), {"status"})
        limit(db, identity)
        record_intake(db, body, identity.actor)
        db.commit()
        return {"revision": body.revision, "is_synthetic": True}

    @app.get("/api/me/sandbox-report")
    def personal(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, "sandbox_report", {"status", "brief"})
        row = latest(db, identity.actor.id)
        if row is None:
            return {"state": "missing", "revision": None, "report": None, "is_synthetic": True}
        report = ScreeningReport.model_validate_json(row.payload)
        approval = (
            ReportRevision(subject_id=report.subject_id, report_id=report.report_id, revision=report.revision)
            if row.approved
            else None
        )
        state, visible = current_report(identity.actor.id, report.report_id, [report], approval)
        return {"state": state, "revision": row.revision, "report": visible, "is_synthetic": True}

    @app.post("/api/me/sandbox-report/share")
    def share(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, "sandbox_report", {"status"})
        limit(db, identity)
        now = time.time()
        active = db.scalar(
            select(Consent.id)
            .where(
                Consent.grantor_id == identity.actor.id,
                Consent.grantee_id == "synthetic-counsellor",
                Consent.resource_type == "sandbox_report",
                Consent.resource_id == identity.actor.id,
                Consent.scope == "sandbox_review",
                Consent.revoked_at.is_(None),
                Consent.expires_at > now,
            )
            .limit(1)
        )
        if active:
            return {"id": active, "is_synthetic": True}
        consent = sharing.grant(
            db,
            identity.actor,
            grantee_id="synthetic-counsellor",
            resource_type="sandbox_report",
            resource_id=identity.actor.id,
            scope="sandbox_review",
            fields=["brief"],
            purpose="counselling",
            expires_at=now + 3600,
            text_shown="Share my synthetic lab reports with the demo counsellor for one hour.",
            salt=secret("KINSIGHT_AUDIT_SALT"),
        )
        review_queue.enqueue(db, "lab_report", identity.actor.id, identity.actor.id)
        db.commit()
        return {"id": consent.id, "is_synthetic": True}

    def review_access(db, identity, subject):
        # The participant opts into pre-release review independently of the sample case.
        check(
            db,
            identity,
            ResourceRef(
                "sandbox_report",
                subject,
                subject,
                owner_viewed=True,
                assigned_to="synthetic-counsellor",
                assignment_expires_at=4_000_000_000.0,
                assignment_reason="sandbox_review",
            ),
            {"brief"},
            "counselling",
            True,
        )

    @app.get("/api/counsellor/sandbox-reports/{subject}")
    def review(subject: Subject, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        review_access(db, identity, subject)
        row = latest(db, subject)
        report = ScreeningReport.model_validate_json(row.payload) if row else None
        return {"report": report, "approved": bool(row and row.approved), "is_synthetic": True}

    @app.post("/api/counsellor/sandbox-reports/{subject}/approve", status_code=204)
    def approve(
        subject: Subject, body: Approval, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)
    ):
        review_access(db, identity, subject)
        row = latest(db, subject)
        if row is None or row.revision != body.revision:
            raise HTTPException(409, "Report has changed. Review the latest revision.")
        report = ScreeningReport.model_validate_json(row.payload)
        if report.status not in {"final", "amended", "corrected"}:
            raise HTTPException(409, "Report is unavailable for release")
        newer = aliased(SandboxReport)
        newest = select(func.max(newer.revision)).where(newer.subject_id == subject).scalar_subquery()
        changed = db.execute(
            update(SandboxReport)
            .where(
                SandboxReport.subject_id == subject,
                SandboxReport.revision == body.revision,
                SandboxReport.revision == newest,
            )
            .values(approved=True)
        )
        if not changed.rowcount:
            raise HTTPException(409, "Report has changed. Review the latest revision.")
        review_queue.resolve(db, "lab_report", subject)
        sharing.log_change(
            db, identity.actor, report.report_id, "sandbox_report_approved", secret("KINSIGHT_AUDIT_SALT")
        )
        db.commit()
        return Response(status_code=204)
