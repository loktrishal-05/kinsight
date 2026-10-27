"""The study analysis reads the /study/results CSV export and reports pass rates per language x level (test inputs, not evidence)."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("analyse_study", Path(__file__).resolve().parents[2] / "scripts" / "analyse_study.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

CSV = """study_id,language,reading_level,case_id,correct,total,passed,clarity,missed,started_at,finished_at
S-1,en,basic,s3,5,5,true,5,,2026-11-01T10:00:00Z,2026-11-01T10:05:00Z
S-2,en,basic,s3,4,5,false,3,q_who_decides,2026-11-01T10:06:00Z,2026-11-01T10:10:00Z
S-3,hi,standard,s3,5,5,true,,,2026-11-01T10:11:00Z,2026-11-01T10:15:00Z
S-4,hi,standard,s3,3,5,false,2,q_who_decides q_chance_value,2026-11-01T10:16:00Z,2026-11-01T10:21:00Z
"""


def test_report_from_export(tmp_path):
    p = tmp_path / "export.csv"
    p.write_text(CSV, encoding="utf-8")
    rows = mod.load(p)
    assert [r["passed"] for r in rows] == [True, False, True, False] and rows[2]["clarity"] is None
    text = mod.report(rows)
    assert "Participants: **4**" in text
    assert "| en | basic | 2 | 50.0% | 4.0 |" in text and "| hi | standard | 2 | 50.0% | 2.0 |" in text
    assert "Largest gap between groups: **0.0 points**" in text
    assert "- `q_who_decides`: 2" in text and "- `q_chance_value`: 1" in text
