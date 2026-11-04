"""Synthetic counselling bookings. Revision ID: 0003."""
from alembic import op

from services.lifecycle.store import LcBooking

revision = "0003"
down_revision = "0002"


def upgrade() -> None:
    LcBooking.__table__.create(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    LcBooking.__table__.drop(op.get_bind(), checkfirst=True)
