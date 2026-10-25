import time

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from services.consent.models import AuditEvent, Base, Consent
from services.consent.policy import Actor, ResourceRef, decide

SALT = b"synthetic-test-audit-salt-32-bytes!"


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def test_default_deny_and_every_decision_audited(db):
    actor = Actor("synthetic-a", "person")
    for resource, fields, expected in [
        (ResourceRef("unknown", "x", actor.id), {"status"}, False),
        (ResourceRef("result", "x", actor.id), {"status"}, True),
        (ResourceRef("result", "x", "other"), {"status"}, False),
    ]:
        assert (
            decide(actor, resource, "own_care", fields, session=db, audit_salt=SALT).allowed
            is expected
        )
    assert len(db.scalars(select(AuditEvent)).all()) == 3


def test_scope_purpose_expiry_owner_first_and_revocation(db):
    grant = Consent(
        grantor_id="a",
        grantee_id="b",
        resource_type="result",
        resource_id="r",
        scope="condition_findings",
        fields=["status"],
        condition_ids=["COND_001"],
        purpose="family_notification",
        expires_at=time.time() + 60,
        text_shown_hash="a" * 64,
    )
    db.add(grant)
    db.flush()
    actor = Actor("b", "relative")
    resource = ResourceRef("result", "r", "a", "COND_001", True)

    def check(purpose="family_notification"):
        return decide(
            actor, resource, purpose, {"status", "panel_version"}, session=db, audit_salt=SALT
        )

    assert check().allowed_fields == {"status"}
    assert not check("employment").allowed
    assert not check("own_care").allowed
    grant.revoked_at = time.time()
    assert not check().allowed
    grant.revoked_at = None
    grant.expires_at = time.time() - 1
    assert not check().allowed
