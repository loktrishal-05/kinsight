"""Persist pre-counselling preparation sheets. Revision ID: 0006."""

from alembic import op

from services.lifecycle.store import PrepSheet

revision = "0006"
down_revision = "0005"


def upgrade() -> None:
    PrepSheet.__table__.create(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    PrepSheet.__table__.drop(op.get_bind(), checkfirst=True)
