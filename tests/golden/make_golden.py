"""Regenerate golden couples: python tests/golden/make_golden.py. Review output with the genetics reviewer."""
import itertools
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from services.genetics import assess_couple
from tests.unit.test_assess import AR, AR1, AR3, PANEL, RULES, XL, couple

cases = []
for cond, (sa, sb), rel in itertools.islice(itertools.product([AR, AR1, AR3, XL],
        [("carrier", "carrier"), ("carrier", "not_detected"), ("not_detected", "not_detected"),
         ("uncertain", "carrier"), ("uncertain", "not_detected")], [False, True]), 20):
    cases.append({"cond": cond.id, "a": sa, "b": sb, "related": rel,
                  "expected": assess_couple(couple(rel), "a", "b", {"a": {cond.id: sa}, "b": {cond.id: sb}},
                                            PANEL, RULES).model_dump()})
pathlib.Path(__file__).with_name("couples.json").write_text(json.dumps(cases, indent=1), encoding="utf-8")
