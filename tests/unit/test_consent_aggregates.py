import pytest
from hypothesis import given
from hypothesis import strategies as st
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from services.consent.aggregates import release, suppress
from services.consent.models import Base, PrivacyBudget
from services.consent.settings import settings


@given(
    st.lists(st.integers(min_value=0, max_value=1000), min_size=1, max_size=30),
    st.integers(min_value=0, max_value=9),
)
def test_suppressed_cells_have_multiple_indistinguishable_values(counts, hidden):
    histogram = {str(i): count for i, count in enumerate(counts)}
    histogram["hidden"] = hidden
    visible = suppress(histogram, 10)
    assert all(value is None for value in visible.values())
    for alternative in range(10):
        assert suppress({**histogram, "hidden": alternative}, 10) == visible


def test_budget_is_durable_and_repeated_release_cannot_average_noise():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    config = settings()
    with Session(engine) as db:
        first = release(db, "partition-0", {"a": 30, "b": 40}, config)
        db.commit()
        assert first == release(db, "partition-0", {"a": 30, "b": 40}, config)
        with pytest.raises(ValueError):
            release(db, "partition-0", {"a": 31, "b": 40}, config)
        for i in range(1, int(config.epsilon_total / config.epsilon_per_release)):
            release(db, f"partition-{i}", {"a": 30}, config)
        db.commit()
        with pytest.raises(PermissionError):
            release(db, "exhausted", {"a": 30}, config)
        assert db.get(PrivacyBudget, "global").spent <= config.epsilon_total
    engine.dispose()
