from datetime import datetime, timezone

import pytest

from services.analytics.comprehension import summarise
from services.lifecycle import booking, cfg, gestation, measures, nasab, triage


@pytest.mark.parametrize("correct,attitude,acted,informed", [
    (5, "favourable", True, True), (5, "unfavourable", False, True),
    (4, "favourable", True, False), (10, "favourable", False, False),
    (10, "unfavourable", True, False),
])
def test_mmic_rule(correct, attitude, acted, informed):
    assert measures.mmic(correct, 10, attitude, acted)["informed"] is informed


@pytest.mark.parametrize("args", [(0, 0, "favourable", True), (3, 2, "favourable", True),
                                  (1, 2, "other", True), (True, 2, "favourable", True)])
def test_mmic_invalid(args):
    with pytest.raises(ValueError):
        measures.mmic(*args)


def test_gcos_scoring_without_items():
    assert measures.gcos24([1] * 24) == 24
    assert measures.gcos24([7] * 24) == 168
    assert measures.gcos24_gain([7] * 24, [1] * 24) == -144
    for answers in ([1] * 23, [1] * 25, [0] * 24, [8] * 24, [True] * 24):
        with pytest.raises(ValueError):
            measures.gcos24(answers)


@pytest.mark.parametrize("relation,expected", [("none", 0), ("first_cousins", 0.0625),
    ("double_first_cousins", 0.125), ("second_cousins", 0.015625),
    ("first_cousins_once_removed", 0.03125), ("uncle_niece_or_aunt_nephew", 0.125)])
def test_nasab_existing_engine(relation, expected):
    result = nasab.evaluate([relation])
    assert result["f"] == result["phi"] == expected
    assert result["warnings"] == []


def test_nasab_multiple_loops_and_limits():
    assert nasab.evaluate(["first_cousins", "second_cousins"])["f"] == 0.078125
    ambiguous = nasab.evaluate(["double_first_cousins", "first_cousins"])
    assert ambiguous["f"] == 0.125 and ambiguous["warnings"]
    four = nasab.evaluate(["second_cousins"] * 4)
    assert four["f"] == 0.0625 and four["warnings"] == []
    assert nasab.evaluate([])["f"] == 0
    for relations in (["unknown"], ["none"] * 5):
        with pytest.raises(ValueError):
            nasab.evaluate(relations)


@pytest.mark.parametrize("day,cvs,past,left", [(0, False, False, 120), (69, False, False, 51),
    (70, True, False, 50), (84, True, False, 36), (85, False, False, 35),
    (119, False, False, 1), (120, False, False, 0), (121, False, True, 0), (300, False, True, 0)])
def test_calendar_boundaries_and_triage(day, cvs, past, left):
    out = gestation.evaluate(day)
    assert out == {"days": day, "weeks": day // 7, "in_cvs_window": cvs,
                   "days_to_day_120": left, "past_day_120": past}
    call = triage.GeneCall("CFTR", "AR", "HET", 5)
    rules = triage.evaluate([call], [call], 0, pregnant_days=day)["rules"]
    assert ("RULE-07_PREGNANCY_WINDOW" in rules) is (day < 120)


def test_calendar_validation():
    for day in (-1, 301, True):
        with pytest.raises(ValueError):
            gestation.evaluate(day)


@pytest.mark.parametrize("weekday", range(7))
@pytest.mark.parametrize("sla", [12, 48, None])
def test_booking_deterministic_template_and_sla(weekday, sla):
    now = datetime(2026, 11, 2 + weekday, 23, 59, tzinfo=timezone.utc).timestamp()
    offered = booking.slots(now, sla)
    assert offered == booking.slots(now, sla) == sorted(set(offered))
    assert 1 <= len(offered) <= 5
    assert all(type(t) is int and t > now for t in offered)
    if sla is not None:
        assert all(t <= now + sla * 3600 for t in offered)
    for at in offered:
        dt = datetime.fromtimestamp(at, timezone.utc)
        assert dt.hour in cfg()["booking"]["weekday_hours"][dt.weekday()]


def test_booking_bounds_and_template_deadline(monkeypatch):
    for sla in (0, -1, 121, True):
        with pytest.raises(ValueError):
            booking.slots(0, sla)
    # Friday evening: five business days reach the following Friday, including its afternoon slot.
    monkeypatch.setitem(cfg()["booking"], "weekday_hours", {4: [18]})
    now = datetime(2026, 11, 6, 19, tzinfo=timezone.utc).timestamp()
    assert booking.slots(now, None) == [int(datetime(2026, 11, 13, 18, tzinfo=timezone.utc).timestamp())]


@pytest.mark.parametrize("gap,alert", [(10.0, False), (10.1, True)])
def test_equity_alert_strict_threshold(gap, alert):
    rows = [{"language": "en", "reading_level": "standard", "passed": True}] * 1000
    rows += [{"language": "ar", "reading_level": "basic", "passed": i < 1000 - round(gap * 10)} for i in range(1000)]
    out = summarise(rows)
    assert out["gap_points"] == gap
    assert (not out["gap_within_target"]) is alert



def test_booking_migration_upgrade_and_downgrade(tmp_path, monkeypatch):
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import create_engine, inspect

    from services.lifecycle.store import LcBooking

    url = f"sqlite:///{tmp_path / 'migration.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    config = Config("alembic.ini")
    command.upgrade(config, "0002")
    engine = create_engine(url)
    # Simulate the historical 0002 schema: that revision imports today's metadata.
    LcBooking.__table__.drop(engine, checkfirst=True)
    command.upgrade(config, "0003")
    assert "lc_booking" in inspect(engine).get_table_names()
    assert any(i["name"] == "lc_booking_one_active_actor" and i["unique"]
               for i in inspect(engine).get_indexes("lc_booking"))
    command.downgrade(config, "0002")
    tables = inspect(engine).get_table_names()
    assert "lc_booking" not in tables and "lc_vault" in tables
    command.upgrade(config, "head")
    assert "lc_booking" in inspect(engine).get_table_names()
    engine.dispose()
