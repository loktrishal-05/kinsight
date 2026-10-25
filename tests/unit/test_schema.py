import os
import subprocess
import sys

from sqlalchemy import create_engine, inspect

from services.cohort.tables import Base, TruthBase
from services.consent.models import Base as ConsentBase

DENY = ["name", "phone", "emirates_id", "passport", "dob", "address", "lat", "lon", "worker_id"]
ALL = (Base.metadata, ConsentBase.metadata, TruthBase.metadata)


def test_no_identity_like_columns_anywhere():
    for md in ALL:
        for t in md.tables.values():
            for c in t.columns:
                assert not any(c.name == d or c.name.startswith(d + "_") for d in DENY), (t.name, c.name)


def test_sim_truth_is_separate_schema_and_metadata():
    assert [t.schema for t in TruthBase.metadata.tables.values()] == ["sim"]
    assert "sim_truth" not in Base.metadata.tables and "sim_truth" not in ConsentBase.metadata.tables


def test_every_table_is_labelled_synthetic():
    for md in ALL:
        assert all("is_synthetic" in t.columns for t in md.tables.values())


def test_alembic_upgrade_runs_on_sqlite(tmp_path):
    db = tmp_path / "m.db"
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{db}"}
    r = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], env=env, capture_output=True, text=True, check=False)
    assert r.returncode == 0, r.stderr
    names = inspect(create_engine(f"sqlite:///{db}")).get_table_names()
    assert "person" in names and "audit_event" in names and "sim_truth" not in names
