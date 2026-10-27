import json
import re

from services.agents.quiz import load_bank
from services.agents.render import load_templates
from services.agents.verify import load_wording

W = load_wording()
ROOT = __import__("pathlib").Path(__file__).resolve().parents[2]


def texts():
    for (lang, _), tset in load_templates().items():
        for b in tset.values():
            yield lang, b.text
    for q in load_bank():
        for lang in q["text"]:
            yield lang, q["text"][lang]
            for o in q.get("options", []):
                if lang in o:
                    yield lang, o[lang]
    # every interface language with its own wording rules (web/messages/<lang>.json, web/content/<lang>.json)
    for lang in W["banned"]:
        for folder in ("messages", "content"):
            p = ROOT / "web" / folder / f"{lang}.json"
            if p.exists():
                yield from ((lang, v) for v in strings(json.loads(p.read_text(encoding="utf-8"))))


def strings(o, key=""):
    """Every user-facing string in a messages/content file; Kin's keyword lists (words, pageWords, aliases) are inputs, not text shown."""
    if isinstance(o, str):
        yield o
    elif isinstance(o, list):
        for x in o:
            yield from strings(x, key)
    elif isinstance(o, dict):
        for k, v in o.items():
            if k not in ("words", "pageWords", "aliases", "myth"):  # a myth is shown struck through, then corrected
                yield from strings(v, k)


def test_no_banned_or_stigmatising_phrases_in_any_user_text():
    for lang, t in texts():
        low = t.lower()
        for p in W["banned"][lang] + W["stigma"][lang]:
            # whole-word match, so a short Arabic term is not found inside an unrelated longer word (e.g. in "notification")
            assert not re.search(rf"(?<![\w]){re.escape(p)}(?![\w])", low), (lang, p, t)


def test_carrier_status_never_called_positive_or_negative():
    for lang, t in texts():
        assert not re.search(r"\b(positive|negative)\b", t.lower()), t
