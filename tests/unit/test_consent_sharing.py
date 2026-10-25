import time

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from services.consent.models import Base, Person
from services.consent.policy import Actor, pooling_allowed
from services.consent.sharing import grant, invite, respond, revoke

SALT = b"synthetic-test-audit-salt-32-bytes!"


def test_invitation_never_implies_pooling_and_revoke_is_immediate():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        a, b = Actor("a", "person"), Actor("b", "person")
        db.add_all(
            [
                Person(id="a", result_viewed_at=time.time()),
                Person(id="b", result_viewed_at=time.time()),
            ]
        )
        db.flush()
        invitation = invite(db, a, "b", "couple_summary", SALT)
        couple = respond(db, b, invitation.id, True, "couple_summary", SALT)
        assert not pooling_allowed(db, couple)
        for actor, other in [(a, b), (b, a)]:
            consent = grant(
                db,
                actor,
                grantee_id=other.id,
                resource_type="couple",
                resource_id=couple.id,
                scope="couple_pooling",
                fields=["tier"],
                purpose="couple_planning",
                expires_at=time.time() + 60,
                text_shown="Fictional pooling permission",
                salt=SALT,
            )
            if actor == a:
                assert not pooling_allowed(db, couple)
        assert pooling_allowed(db, couple)
        couple.released = True
        revoke(db, b, consent.id, SALT)
        assert not pooling_allowed(db, couple)
        assert not couple.released
    engine.dispose()
