import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import export_web_fixtures as ex  # noqa: E402


def test_committed_web_fixtures_match_the_engine_and_templates():
    """If this fails, run `python scripts/export_web_fixtures.py` and commit web/lib/fixtures/data.json."""
    committed = json.loads((ROOT / "web/lib/fixtures/data.json").read_text(encoding="utf-8"))
    assert json.loads(json.dumps(ex.build(), ensure_ascii=False)) == committed


def test_scenarios_cover_every_tier_and_every_draft_verifies():
    d = json.loads((ROOT / "web/lib/fixtures/data.json").read_text(encoding="utf-8"))
    assert {s["tier"] for s in d["scenarios"]} == {1, 2, 3} and len(d["scenarios"]) >= 7
    for s in d["scenarios"]:
        assert set(s["explanations"]) == {"en/basic", "en/standard", "ar/basic", "ar/standard"}
        assert all(q["answer"] in [o["id"] for o in q["options"]] for q in s["quiz"]["en"])
