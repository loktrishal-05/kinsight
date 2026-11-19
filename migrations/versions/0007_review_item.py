"""Unified counsellor review queue. Revision ID: 0007."""

from alembic import op

from services.lifecycle.store import ReviewItem

revision = "0007"
down_revision = "0006"


def upgrade() -> None:
    ReviewItem.__table__.create(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    ReviewItem.__table__.drop(op.get_bind(), checkfirst=True)
