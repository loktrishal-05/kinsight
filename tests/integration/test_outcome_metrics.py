"""Outcome metrics: every event has a real producer, counts are suppressed, and no marriage outcome is measured."""
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from services.analytics.events import EVENTS, outcomes
from services.api.demo.path import _h
from services.api.main import create_app
from services.consent.models import Person
from services.lifecycle.store import PrepSheet

ROOT = Path(__file__).resolve().parents[2]
CODE = "\n".join(p.read_text(encoding="utf-8") for p in (ROOT / "services").rglob("*.py"))
SALT = b"synthetic-only-audit-salt-32-bytes"


def test_every_event_names_a_source_that_the_code_actually_writes():
    for name, (_, source) in EVENTS.items():
        kind, _, what = source.partition(":")
        if kind == "audit":
            assert re.search(rf'"{what}"', CODE.replace(f'"{what}": (', "")), f"{name}: nothing logs {what}"
        else:
            assert f'__tablename__ = "{source.split(".")[0].split(":")[0]}"' in CODE, f"{name}: no table {source}"


def test_no_marriage_or_pregnancy_outcome_is_measured():
    words = " ".join(f"{n} {label} {src}" for n, (label, src) in EVENTS.items()).lower()
    assert not any(w in words for w in ("marriage", "marri", "engagement", "wedding", "pregnan", "abortion", "termination"))


@pytest.fixture
def db(tmp_path):
    from sqlalchemy import create_engine

    from services.consent.models import Base
    from services.lifecycle.store import LifecycleBase

    engine = create_engine(f"sqlite:///{tmp_path / 'm.db'}")
    Base.metadata.create_all(engine)
    LifecycleBase.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def people(db, n, language, level="basic", viewed=0, sheets=0):
    for i in range(n):
        pid = f"{language}-{level}-{i}"
        db.add(Person(id=pid, language=language, reading_level=level, result_viewed_at=1.0 if i < viewed else None))
        if i < sheets:
            db.add(PrepSheet(subject_id=pid, payload="{}", shared="[]", updated_at=1.0))
    db.commit()


def test_small_groups_are_hidden_and_large_ones_are_shown(db):
    people(db, 12, "en", viewed=11, sheets=10)
    people(db, 3, "ar", viewed=3)
    m = {r["name"]: r for r in outcomes(db, SALT, 10)["metrics"]}
    assert m["result_viewed"]["groups"] == {"ar/basic": None, "en/basic": None}  # one small cell hides the partition
    assert m["result_viewed"]["total"] == 14 and m["counsellor_requested"]["total"] is None


def test_equity_gap_of_more_than_ten_points_is_flagged(db):
    people(db, 20, "en", viewed=19)
    people(db, 20, "ar", viewed=12)
    m = {r["name"]: r for r in outcomes(db, SALT, 10)["metrics"]}
    assert m["result_viewed"]["rates"] == {"ar/basic": 0.6, "en/basic": 0.95}
    assert m["result_viewed"]["equity_alert"] is True


def test_route_is_analyst_only(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    with TestClient(create_app("sqlite://")) as c:
        r = c.get("/api/analytics/outcomes", headers=_h(c, "analyst"))
        assert r.status_code == 200 and r.json()["marriage_outcomes_measured"] is False
        assert c.get("/api/analytics/outcomes", headers=_h(c, "person_a")).status_code == 403
