import json
import pathlib

from services.genetics import assess_couple
from tests.unit.test_assess import PANEL, RULES, couple


def test_golden_couples():  # expected JSON pending genetics-reviewer sign-off (docs/REVIEWS.md)
    cases = json.loads((pathlib.Path(__file__).parents[1] / "golden/couples.json").read_text(encoding="utf-8"))
    assert len(cases) == 20
    for c in cases:
        got = assess_couple(couple(c["related"]), "a", "b", {"a": {c["cond"]: c["a"]}, "b": {c["cond"]: c["b"]}},
                            PANEL, RULES)
        assert got.model_dump() == c["expected"]
