from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from services.consent.audit import GENESIS, append_event, verify_chain
from services.consent.models import AuditEvent, Base


def test_chain_tamper_and_external_head():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        assert verify_chain(db, GENESIS)
        for _ in range(3):
            append_event(
                db,
                actor_ref="salted",
                action="read",
                resource_type="result",
                resource_ref="salted",
                decision="deny",
                reason_code="default_deny",
            )
        db.commit()
        rows = db.scalars(select(AuditEvent).order_by(AuditEvent.id)).all()
        head = rows[-1].hash
        assert verify_chain(db, head)
        for row in rows:
            original = row.reason_code
            row.reason_code = "tampered"
            db.flush()
            assert not verify_chain(db)
            row.reason_code = original
            db.flush()
        db.delete(rows[-1])
        db.flush()
        assert not verify_chain(db, head)
    engine.dispose()
