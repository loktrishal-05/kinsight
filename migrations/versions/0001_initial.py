"""Initial schema: consent tables, cohort tables, and sim_truth in its own schema.

Revision ID: 0001
"""
from alembic import op

from services.cohort.tables import Base as CohortBase
from services.cohort.tables import TruthBase
from services.consent.models import Base as ConsentBase

revision = "0001"
down_revision = None


def upgrade() -> None:
    bind = op.get_bind()
    ConsentBase.metadata.create_all(bind)
    CohortBase.metadata.create_all(bind)
    # SQLite has no schemas, so sim_truth is created on Postgres only (local checks keep it out of the API metadata).
    if bind.dialect.name == "postgresql":
        op.execute("CREATE SCHEMA IF NOT EXISTS sim")
        TruthBase.metadata.create_all(bind)
        # The API role must not read sim_truth; only the evaluation role may.
        op.execute("REVOKE ALL ON SCHEMA sim FROM PUBLIC")
        op.execute("REVOKE ALL ON ALL TABLES IN SCHEMA sim FROM PUBLIC")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        TruthBase.metadata.drop_all(bind)
    CohortBase.metadata.drop_all(bind)
    ConsentBase.metadata.drop_all(bind)
