"""Synthetic-only API. Inject a Backend to connect genetics and case workflows."""

# FastAPI evaluates dependency declarations when registering routes.
# ruff: noqa: B008

import hashlib
import json
import os
import time
from contextlib import asynccontextmanager
from importlib.metadata import version
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import create_engine, delete, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from services.consent import sharing
from services.consent.aggregates import release
from services.consent.audit import verify_chain
from services.consent.models import (
    Base,
    CaseAccess,
    Consent,
    Couple,
    Invitation,
    Person,
    RateWindow,
)
from services.consent.policy import (
    PURPOSES,
    RESOURCE_FIELDS,
    ROLE_RESOURCES,
    SCOPES,
    Decision,
    ResourceRef,
    decide,
    pooling_allowed,
    reference,
)
from services.consent.roles import PERSONAS
from services.consent.settings import settings

from .auth import Identity, issue_token, secret, verify_token
from .interfaces import Backend, Unavailable, UnwiredBackend
from .schemas import (
    AggregateView,
    Alias,
    Answers,
    CaseView,
    Chat,
    ConsentView,
    CounsellorDecision,
    CoupleView,
    Evaluation,
    Explanation,
    GrantRequest,
    InvitationView,
    InviteRequest,
    PedigreeInput,
    PedigreeView,
    PersonaRequest,
    Profile,
    ReferralEvent,
    RespondRequest,
    ResponseView,
    Result,
    Status,
    TokenResponse,
)

bearer = HTTPBearer(auto_error=False)


def create_app(database_url: str | None = None, backend: Backend | None = None) -> FastAPI:
    url = database_url or os.environ.get("DATABASE_URL", "sqlite:///kinsight-consent.db")
    options = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {}
    if url in {"sqlite://", "sqlite:///:memory:"}:
        options["poolclass"] = StaticPool
    engine = create_engine(url, **options)
    sessions = sessionmaker(engine, expire_on_commit=False)
    adapter = backend or UnwiredBackend()

    @asynccontextmanager
    async def lifespan(app):
        secret("KINSIGHT_TOKEN_SECRET")
        secret("KINSIGHT_AUDIT_SALT")
        Base.metadata.create_all(engine)
        yield
        engine.dispose()

    app = FastAPI(title="KinSight fictional demo", version="0.1.0", lifespan=lifespan)
    app.state.sessions = sessions
    app.state.engine = engine
    app.state.backend = adapter

    def db_session():
        with sessions() as db:
            yield db

    def authenticate(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    ) -> Identity:
        if credentials is None or credentials.scheme.lower() != "bearer":
            raise HTTPException(401, "Bearer token required")
        try:
            return verify_token(credentials.credentials)
        except ValueError:
            raise HTTPException(401, "Invalid or expired token") from None

    def roles(*allowed: str):
        def dependency(
            identity: Identity = Depends(authenticate), db: Session = Depends(db_session)
        ):
            if identity.actor.role not in allowed:
                sharing.log_change(
                    db, identity.actor, "route", "role_denied", secret("KINSIGHT_AUDIT_SALT")
                )
                db.commit()
                raise HTTPException(403, "Role denied")
            return identity

        return dependency

    def check(
        db: Session,
        identity: Identity,
        resource: ResourceRef,
        fields: set[str],
        purpose: str = "own_care",
        require_all: bool = False,
    ) -> Decision:
        decision = decide(
            identity.actor,
            resource,
            purpose,
            fields,
            session=db,
            audit_salt=secret("KINSIGHT_AUDIT_SALT"),
        )
        db.commit()  # A refused HTTP request must not roll back its decision event.
        if not decision.allowed or require_all and decision.allowed_fields != fields:
            raise HTTPException(403, "Access unavailable")
        return decision

    def own(db: Session, identity: Identity, resource_type: str, fields: set[str]):
        check(
            db, identity, ResourceRef(resource_type, identity.actor.id, identity.actor.id), fields
        )
        person = db.get(Person, identity.actor.id)
        if person is None:
            raise HTTPException(404, "Synthetic profile not found")
        return person

    def limit(db: Session, identity: Identity):
        config = settings()
        key = reference(identity.token_id, secret("KINSIGHT_AUDIT_SALT"))
        window = int(time.time()) // config.rate_limit_window_seconds
        row = db.get(RateWindow, key)
        if row is None:
            db.add(RateWindow(id=key, window=window, requests=1))
        elif row.window != window:
            db.execute(
                update(RateWindow)
                .where(RateWindow.id == key, RateWindow.window != window)
                .values(window=window, requests=0)
            )
            result = db.execute(
                update(RateWindow)
                .where(RateWindow.id == key, RateWindow.requests < config.rate_limit_requests)
                .values(requests=RateWindow.requests + 1)
            )
            if not result.rowcount:
                raise HTTPException(429, "Request limit reached")
        else:
            result = db.execute(
                update(RateWindow)
                .where(RateWindow.id == key, RateWindow.requests < config.rate_limit_requests)
                .values(requests=RateWindow.requests + 1)
            )
            if not result.rowcount:
                raise HTTPException(429, "Request limit reached")
        db.commit()

    def case_ref(db: Session, case_id: str) -> ResourceRef:
        row = db.get(CaseAccess, case_id, populate_existing=True)
        if row is None:
            return ResourceRef("case", case_id)
        person = db.get(Person, row.owner_id)
        return ResourceRef(
            "case",
            row.id,
            row.owner_id,
            owner_viewed=bool(person and person.result_viewed_at),
            assigned_to=row.assigned_to,
            assignment_expires_at=row.assignment_expires_at,
            assignment_reason=row.assignment_reason,
        )

    def case_check(db, identity, case_id, fields, require_all=False):
        purpose = "counselling" if identity.actor.role == "counsellor" else "own_care"
        return check(db, identity, case_ref(db, case_id), fields, purpose, require_all)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # FastAPI's default error includes submitted values; do not echo poisoned or sensitive text.
        return JSONResponse(
            status_code=422, content={"detail": "Invalid request", "is_synthetic": True}
        )

    @app.exception_handler(Unavailable)
    async def unavailable(request, exc):
        return JSONResponse(
            status_code=503, content={"detail": "Service not connected", "is_synthetic": True}
        )

    @app.exception_handler(PermissionError)
    async def permission_error(request, exc):
        return JSONResponse(
            status_code=403, content={"detail": "Access unavailable", "is_synthetic": True}
        )

    @app.exception_handler(ValueError)
    async def value_error(request, exc):
        return JSONResponse(
            status_code=422, content={"detail": "Invalid request", "is_synthetic": True}
        )

    @app.exception_handler(IntegrityError)
    async def concurrent_change(request, exc):
        return JSONResponse(
            status_code=409, content={"detail": "Concurrent change; retry", "is_synthetic": True}
        )

    @app.middleware("http")
    async def no_cache(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/api/health")
    async def health():
        config = settings().model_dump_json()
        return {
            "status": "ok",
            "is_synthetic": True,
            "versions": {key: version(key) for key in ("fastapi", "pydantic", "sqlalchemy")},
            "config_hash": hashlib.sha256(config.encode()).hexdigest(),
        }

    @app.post("/api/auth/persona", response_model=TokenResponse)
    async def persona(body: PersonaRequest, db: Session = Depends(db_session)):
        token = issue_token(body.persona)
        actor = PERSONAS[body.persona]
        if actor.role in {"person", "partner", "relative"} and db.get(Person, actor.id) is None:
            db.add(Person(id=actor.id))
            db.commit()
        return TokenResponse(access_token=token, expires_in=settings().token_ttl_seconds)

    @app.get("/api/me", response_model=Profile)
    async def me(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        row = own(db, identity, "profile", RESOURCE_FIELDS["profile"])
        return Profile(id=row.id, language=row.language, reading_level=row.reading_level)

    @app.delete("/api/me", response_model=Status)
    async def delete_me(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, "profile", RESOURCE_FIELDS["profile"])
        subject = identity.actor.id
        await adapter.delete_person(subject, db)
        couples = select(Couple.id).where(
            or_(Couple.person_a == subject, Couple.person_b == subject)
        )
        db.execute(
            delete(Consent).where(
                or_(
                    Consent.grantor_id == subject,
                    Consent.grantee_id == subject,
                    Consent.resource_id.in_(couples),
                )
            )
        )
        db.execute(
            delete(CaseAccess).where(
                or_(CaseAccess.owner_id == subject, CaseAccess.couple_id.in_(couples))
            )
        )
        db.execute(
            delete(Couple).where(or_(Couple.person_a == subject, Couple.person_b == subject))
        )
        db.execute(
            delete(Invitation).where(
                or_(Invitation.sender_id == subject, Invitation.recipient_id == subject)
            )
        )
        db.execute(delete(Person).where(Person.id == subject))
        sharing.log_change(db, identity.actor, subject, "delete", secret("KINSIGHT_AUDIT_SALT"))
        db.commit()
        return Status(status="deleted")

    @app.get("/api/me/results", response_model=list[Result])
    async def results(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        person = own(db, identity, "result", RESOURCE_FIELDS["result"])
        data = await adapter.invoke("results", identity.actor.id, None, db)
        validated = [Result.model_validate(row) for row in data]
        person.result_viewed_at = time.time()
        db.commit()
        return validated

    @app.get("/api/me/results/{id}/explanation", response_model=Explanation)
    async def explanation(
        id: Alias, identity=Depends(roles("person")), db: Session = Depends(db_session)
    ):
        own(db, identity, "explanation", RESOURCE_FIELDS["explanation"])
        return Explanation.model_validate(
            await adapter.invoke("explanation", identity.actor.id, {"result_id": id}, db)
        )

    @app.get("/api/me/consents", response_model=list[ConsentView])
    async def consents(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, "consent", RESOURCE_FIELDS["consent"])
        return [
            ConsentView.model_validate(
                {field: getattr(row, field) for field in RESOURCE_FIELDS["consent"]}
            )
            for row in db.scalars(select(Consent).where(Consent.grantor_id == identity.actor.id))
        ]

    @app.post("/api/me/consents", response_model=ConsentView)
    async def create_consent(
        body: GrantRequest, identity=Depends(roles("person")), db: Session = Depends(db_session)
    ):
        own(db, identity, "consent", RESOURCE_FIELDS["consent"])
        limit(db, identity)
        row = sharing.grant(
            db, identity.actor, **body.model_dump(), salt=secret("KINSIGHT_AUDIT_SALT")
        )
        db.commit()
        return ConsentView.model_validate(
            {field: getattr(row, field) for field in RESOURCE_FIELDS["consent"]}
        )

    @app.post("/api/me/consents/{id}/revoke", response_model=Status)
    async def revoke(
        id: Alias, identity=Depends(roles("person")), db: Session = Depends(db_session)
    ):
        own(db, identity, "consent", RESOURCE_FIELDS["consent"])
        # Revocation stays available even after the grant rate limit is exhausted.
        sharing.revoke(db, identity.actor, id, secret("KINSIGHT_AUDIT_SALT"))
        db.commit()
        return Status(status="revoked")

    @app.post("/api/invitations", response_model=InvitationView)
    async def invitation(
        body: InviteRequest, identity=Depends(roles("person")), db: Session = Depends(db_session)
    ):
        own(db, identity, "invitation", RESOURCE_FIELDS["invitation"])
        limit(db, identity)
        row = sharing.invite(
            db, identity.actor, body.recipient_id, body.scope, secret("KINSIGHT_AUDIT_SALT")
        )
        db.commit()
        return InvitationView(id=row.id, scope=row.scope, status="pending")

    @app.post("/api/invitations/{id}/respond", response_model=ResponseView)
    async def respond(
        id: Alias,
        body: RespondRequest,
        identity=Depends(roles("person", "partner", "relative")),
        db: Session = Depends(db_session),
    ):
        limit(db, identity)
        row = db.get(Invitation, id)
        # Recipient-only workflow; the invitation contains no result data.
        if row is None or row.recipient_id != identity.actor.id:
            check(db, identity, ResourceRef("invitation", id), {"status"})
            raise HTTPException(403, "Access unavailable")
        decision = decide(
            identity.actor,
            ResourceRef("invitation", id, row.recipient_id),
            "own_care",
            {"status"},
            session=db,
            audit_salt=secret("KINSIGHT_AUDIT_SALT"),
        )
        db.commit()
        if not decision.allowed:
            raise HTTPException(403, "Access unavailable")
        couple = sharing.respond(
            db, identity.actor, id, body.accepted, body.scope, secret("KINSIGHT_AUDIT_SALT")
        )
        db.commit()
        return ResponseView(status="recorded", couple_id=couple.id if couple else None)

    @app.get("/api/me/pedigree", response_model=PedigreeView)
    async def pedigree(identity=Depends(roles("person")), db: Session = Depends(db_session)):
        own(db, identity, "pedigree", RESOURCE_FIELDS["pedigree"])
        return PedigreeView.model_validate(
            await adapter.invoke("pedigree", identity.actor.id, None, db)
        )

    @app.put("/api/me/pedigree", response_model=PedigreeView)
    async def edit_pedigree(
        body: PedigreeInput, identity=Depends(roles("person")), db: Session = Depends(db_session)
    ):
        own(db, identity, "pedigree", RESOURCE_FIELDS["pedigree"])
        data = PedigreeView.model_validate(
            await adapter.invoke("edit_pedigree", identity.actor.id, body.model_dump(), db)
        )
        db.commit()
        return data

    @app.get(
        "/api/couples/{id}/assessment", response_model=CoupleView, response_model_exclude_unset=True
    )
    async def assessment(
        id: Alias, identity=Depends(roles("partner")), db: Session = Depends(db_session)
    ):
        row = db.get(Couple, id)
        if (
            row is None
            or identity.actor.id not in {row.person_a, row.person_b}
            or not pooling_allowed(db, row)
            or not row.released
        ):
            check(db, identity, ResourceRef("couple", id), {"tier"}, "couple_planning")
            raise HTTPException(403, "Access unavailable")
        other = row.person_b if row.person_a == identity.actor.id else row.person_a
        decision = check(
            db,
            identity,
            ResourceRef("couple", id, other, owner_viewed=True),
            {"tier", "shared_conditions", "findings", "engine_version"},
            "couple_planning",
        )
        data = CoupleView.model_validate(await adapter.invoke("assessment", id, None, db))
        # Recheck after awaiting a backend: another request may have revoked consent.
        db.expire_all()
        if not pooling_allowed(db, db.get(Couple, id)):
            raise HTTPException(403, "Access unavailable")
        decision = check(
            db,
            identity,
            ResourceRef("couple", id, other, owner_viewed=True),
            set(decision.allowed_fields),
            "couple_planning",
        )
        return {**data.model_dump(include=set(decision.allowed_fields)), "is_synthetic": True}

    @app.post("/api/cases/{id}/quiz/answers", response_model=Status)
    async def answers(
        id: Alias,
        body: Answers,
        identity=Depends(roles("person")),
        db: Session = Depends(db_session),
    ):
        case_check(db, identity, id, {"quiz"}, True)
        result = Status.model_validate(
            await adapter.invoke("quiz_answers", id, body.model_dump(), db)
        )
        db.commit()
        return result

    @app.get("/api/cases/{id}/referral", response_model=CaseView, response_model_exclude_unset=True)
    async def referral(
        id: Alias,
        identity=Depends(roles("person", "counsellor")),
        db: Session = Depends(db_session),
    ):
        case_check(db, identity, id, {"referral"}, True)
        data = CaseView.model_validate(await adapter.invoke("referral", id, None, db))
        case_check(db, identity, id, {"referral"}, True)
        return {"referral": data.referral, "is_synthetic": True}

    @app.get(
        "/api/counsellor/queue", response_model=list[CaseView], response_model_exclude_unset=True
    )
    async def queue(identity=Depends(roles("counsellor")), db: Session = Depends(db_session)):
        # Only assigned metadata is enumerated; each item passes policy before backend access.
        ids = db.scalars(
            select(CaseAccess.id)
            .where(CaseAccess.assigned_to == identity.actor.id)
            .order_by(CaseAccess.id)
            .limit(50)
        ).all()
        output = []
        for case_id in ids:
            try:
                case_check(db, identity, case_id, {"status"}, True)
            except HTTPException:
                continue
            data = CaseView.model_validate(await adapter.invoke("case_status", case_id, None, db))
            case_check(db, identity, case_id, {"status"}, True)
            output.append({"status": data.status, "is_synthetic": True})
        return output

    @app.get(
        "/api/counsellor/cases/{id}/brief",
        response_model=CaseView,
        response_model_exclude_unset=True,
    )
    async def brief(
        id: Alias, identity=Depends(roles("counsellor")), db: Session = Depends(db_session)
    ):
        case_check(db, identity, id, {"brief"}, True)
        data = CaseView.model_validate(await adapter.invoke("brief", id, None, db))
        case_check(db, identity, id, {"brief"}, True)
        return {"brief": data.brief, "is_synthetic": True}

    @app.post("/api/counsellor/cases/{id}/decision", response_model=Status)
    async def decision(
        id: Alias,
        body: CounsellorDecision,
        identity=Depends(roles("counsellor")),
        db: Session = Depends(db_session),
    ):
        case_check(db, identity, id, {"brief"}, True)
        data = Status.model_validate(await adapter.invoke("decision", id, body.model_dump(), db))
        sharing.log_change(
            db, identity.actor, id, "counsellor_decision", secret("KINSIGHT_AUDIT_SALT")
        )
        db.commit()
        return data

    @app.post("/api/counsellor/cases/{id}/referral/events", response_model=Status)
    async def referral_event(
        id: Alias,
        body: ReferralEvent,
        identity=Depends(roles("counsellor")),
        db: Session = Depends(db_session),
    ):
        case_check(db, identity, id, {"referral"}, True)
        data = Status.model_validate(
            await adapter.invoke("referral_event", id, body.model_dump(), db)
        )
        sharing.log_change(db, identity.actor, id, "referral_event", secret("KINSIGHT_AUDIT_SALT"))
        db.commit()
        return data

    def aggregate_route(kind):
        async def endpoint(identity=Depends(roles("analyst")), db: Session = Depends(db_session)):
            check(db, identity, ResourceRef("aggregate", kind), RESOURCE_FIELDS["aggregate"])
            counts = await adapter.invoke("aggregate_counts", kind, None, db)
            data = release(db, kind, counts, settings())
            db.commit()
            return data

        return endpoint

    for kind in ("dashboard", "comprehension", "capacity"):
        app.add_api_route(
            f"/api/analytics/{kind}",
            aggregate_route(kind),
            methods=["GET"],
            response_model=AggregateView,
        )

    @app.post("/api/eval/run", response_model=Evaluation)
    async def eval_run(
        identity=Depends(roles("analyst", "auditor")), db: Session = Depends(db_session)
    ):
        check(db, identity, ResourceRef("evaluation", "run"), {"metrics"})
        data = Evaluation.model_validate(await adapter.invoke("eval_run", "synthetic", None, db))
        db.commit()
        return data

    @app.get("/api/eval/{id}", response_model=Evaluation)
    async def evaluation(
        id: Alias, identity=Depends(roles("analyst", "auditor")), db: Session = Depends(db_session)
    ):
        check(db, identity, ResourceRef("evaluation", id), {"metrics"})
        return Evaluation.model_validate(await adapter.invoke("evaluation", id, None, db))

    @app.get("/api/governance/audit-verify")
    async def audit_verify(identity=Depends(roles("auditor")), db: Session = Depends(db_session)):
        check(db, identity, ResourceRef("audit", "chain"), {"events"})
        return {"valid": verify_chain(db), "is_synthetic": True}

    @app.get("/api/governance/policy")
    async def policy(identity=Depends(roles("auditor")), db: Session = Depends(db_session)):
        check(db, identity, ResourceRef("governance", "policy"), {"metadata"})
        return {
            "purposes": sorted(PURPOSES),
            "scopes": {k: sorted(v) for k, v in SCOPES.items()},
            "unrelated_use": "Employment, insurance and commercial uses are denied.",
            "is_synthetic": True,
        }

    @app.get("/api/governance/model-card")
    async def model_card(identity=Depends(roles("auditor")), db: Session = Depends(db_session)):
        check(db, identity, ResourceRef("governance", "model-card"), {"metadata"})
        return {
            "status": "Unwired synthetic demonstration; no clinical validation",
            "is_synthetic": True,
        }

    @app.get("/api/governance/data-sources")
    async def data_sources():
        path = Path(__file__).resolve().parents[2] / "DATA_SOURCES.md"
        return {"metadata": path.read_text(encoding="utf-8"), "is_synthetic": True}

    @app.get("/api/stream")
    async def stream(identity=Depends(roles(*ROLE_RESOURCES)), db: Session = Depends(db_session)):
        resource_type = {
            "person": "consent",
            "partner": "couple",
            "relative": "invitation",
            "counsellor": "case",
            "analyst": "aggregate",
            "auditor": "governance",
            "demo_operator": "demo",
        }[identity.actor.role]
        check(
            db,
            identity,
            ResourceRef(resource_type, identity.actor.id, identity.actor.id),
            RESOURCE_FIELDS[resource_type],
        )

        # No event source is connected. Send no private state across a long-lived authorization.
        async def events():
            yield ": synthetic stream connected; no event source configured\n\n"

        return StreamingResponse(events(), media_type="text/event-stream")

    @app.post("/api/copilot/chat")
    async def chat(
        body: Chat, identity=Depends(roles("person")), db: Session = Depends(db_session)
    ):
        own(db, identity, "result", RESOURCE_FIELDS["result"])
        limit(db, identity)

        async def events():
            payload = {
                "status": "unavailable",
                "is_synthetic": True,
                "message": "The copilot is not connected. No personal data was retrieved.",
            }
            yield f"event: message\ndata: {json.dumps(payload)}\n\n"

        return StreamingResponse(events(), media_type="text/event-stream")

    def demo_route(operation):
        async def endpoint(
            identity=Depends(roles("demo_operator")), db: Session = Depends(db_session)
        ):
            check(db, identity, ResourceRef("demo", operation), {"status"})
            data = Status.model_validate(await adapter.invoke(operation, "synthetic", None, db))
            db.commit()
            return data

        return endpoint

    for operation in ("reset", "load-cohort"):
        app.add_api_route(
            f"/api/demo/{operation}", demo_route(operation), methods=["POST"], response_model=Status
        )

    return app


app = create_app()
