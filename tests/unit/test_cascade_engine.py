"""Per-degree carrier chances and the consanguinity adjustment for cascade screening."""
import pytest

from services.agents.eval import _couple
from services.genetics.cascade import relatives
from services.genetics.pedigree import Pedigree

C = 0.04


def test_textbook_chances_by_degree_plus_background():
    got = {r["id"]: r for r in relatives(_couple(True), "a", C, {"b"})}
    assert got["x"]["relation"] == "parent" and got["x"]["chance"] == pytest.approx(0.5 + 0.5 * C)
    assert got["gf"]["relation"] == "grandparent" and got["gf"]["chance"] == pytest.approx(0.25 + 0.75 * C)
    assert got["y"]["relation"] == "aunt_uncle" and got["y"]["degree"] == 2
    assert "b" not in got and "ys" not in got  # the partner is screened as a couple; in-laws share no ancestry


def test_first_cousin_is_third_degree():
    [b] = [r for r in relatives(_couple(True), "a", C) if r["id"] == "b"]
    assert b["relation"] == "cousin" and b["degree"] == 3 and b["chance"] == pytest.approx(0.125 + 0.875 * C)


def family(related_parents: bool) -> Pedigree:
    """Two siblings whose parents are first cousins (or unrelated)."""
    p = Pedigree()
    for pid, sex in [("gf", "male"), ("gm", "female"), ("u1", "male"), ("u2", "female"), ("s1", "female"),
                     ("s2", "male"), ("dad", "male"), ("mum", "female"), ("me", "female"), ("sib", "male")]:
        p.add_person(pid, sex)
    for child, parent in [("u1", "gf"), ("u1", "gm"), ("u2", "gf"), ("u2", "gm"), ("dad", "u1"), ("dad", "s1"),
                          ("me", "dad"), ("me", "mum"), ("sib", "dad"), ("sib", "mum")]:
        p.add_parent(child, parent)
    if related_parents:
        p.add_parent("mum", "u2")
        p.add_parent("mum", "s2")
    return p


def test_consanguinity_raises_the_chance_for_close_relatives():
    plain = {r["id"]: r["chance"] for r in relatives(family(False), "me", C)}
    related = {r["id"]: r["chance"] for r in relatives(family(True), "me", C)}
    assert plain["sib"] == pytest.approx(0.5 + 0.5 * C)
    assert related["sib"] > plain["sib"]  # extra shared ancestry through the related parents
    assert all(0 <= v <= 1 for v in related.values())


def test_web_mock_fixture_matches_the_engine():
    import json
    from pathlib import Path

    from scripts.export_cascade import export

    web = json.loads((Path(__file__).parents[2] / "web/lib/fixtures/cascade.json").read_text(encoding="utf-8"))
    assert web == json.loads(json.dumps(export())), "run: python scripts/export_cascade.py"
