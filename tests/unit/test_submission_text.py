"""The submission form has hard character limits; the drafts must fit them."""
import re
from pathlib import Path

TEXT = (Path(__file__).resolve().parents[2] / "docs" / "submission" / "form-text.md").read_text(encoding="utf-8")


def section(name: str) -> str:
    return re.search(rf"<!-- {name}:start -->\n(.*?)\n<!-- {name}:end -->", TEXT, re.S).group(1).strip()


def test_summary_fits_2000_characters():
    assert 0 < len(section("summary")) <= 2000, len(section("summary"))


def test_built_fits_1500_characters():
    assert 0 < len(section("built")) <= 1500, len(section("built"))


def test_no_directive_or_overclaiming_language():
    both = (section("summary") + section("built")).lower()
    assert not any(w in both for w in ("should marry", "you should", "diagnose your", "clinically validated", "proven"))
