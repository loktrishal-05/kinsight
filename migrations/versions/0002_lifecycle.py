"""Lifecycle state: pairings, lab sample, single-use token nonces, whisper vouchers, safe vault.

Revision ID: 0002
"""
from alembic import op

from services.lifecycle.store import LifecycleBase

revision = "0002"
down_revision = "0001"


def upgrade() -> None:
    LifecycleBase.metadata.create_all(op.get_bind())


def downgrade() -> None:
    LifecycleBase.metadata.drop_all(op.get_bind())
