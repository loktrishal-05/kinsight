"""Cascade screening tracker. Revision ID: 0008."""

from alembic import op

from services.lifecycle.store import CascadeContact

revision = "0008"
down_revision = "0007"


def upgrade() -> None:
    CascadeContact.__table__.create(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    CascadeContact.__table__.drop(op.get_bind(), checkfirst=True)
