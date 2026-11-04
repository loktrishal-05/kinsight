from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PHRASES = ("0% risk", "zero risk", "defective", "faulty blood")


def test_banned_phrases():
    paths = [p for directory in ("services", "templates", "configs") for p in (ROOT / directory).rglob("*")
             if p.is_file() and p.suffix in {".py", ".yaml", ".yml", ".json", ".md", ".txt"}]
    paths += list((ROOT / "web" / "messages").glob("*.json"))
    hits = []
    for path in paths:
        text = path.read_text(encoding="utf-8").lower()
        # Exempt only the existing deny-list entry; other matches, including comments, still fail.
        allowed = {"configs/wording.yaml": '"defective"', "templates/en/wording.yaml": "- defective"}
        if entry := allowed.get(path.relative_to(ROOT).as_posix()):
            text = text.replace(entry, "", 1)
        hits.extend(f"{path.relative_to(ROOT)}: {phrase}" for phrase in PHRASES if phrase in text)
    assert not hits, "\n".join(hits)
