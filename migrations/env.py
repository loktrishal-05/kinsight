import os

from alembic import context
from sqlalchemy import create_engine

from services.cohort.tables import Base as CohortBase
from services.cohort.tables import TruthBase
from services.consent.models import Base as ConsentBase

targets = [ConsentBase.metadata, CohortBase.metadata, TruthBase.metadata]
url = os.environ.get("DATABASE_URL") or context.config.get_main_option("sqlalchemy.url")


def run() -> None:
    engine = create_engine(url)
    with engine.connect() as conn:
        context.configure(connection=conn, target_metadata=targets, include_schemas=True)
        with context.begin_transaction():
            context.run_migrations()


run()
