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
        for lang in ("en", "ar"):
            yield lang, q["text"][lang]
            for o in q.get("options", []):
                yield lang, o[lang]
    for lang in ("en", "ar"):
        for v in json.loads((ROOT / "web/messages" / f"{lang}.json").read_text(encoding="utf-8")).values():
            yield lang, v


def test_no_banned_or_stigmatising_phrases_in_any_user_text():
    for lang, t in texts():
        low = t.lower()
        for p in W["banned"][lang] + W["stigma"][lang]:
            assert p not in low, (lang, p, t)


def test_carrier_status_never_called_positive_or_negative():
    for lang, t in texts():
        assert not re.search(r"\b(positive|negative)\b", t.lower()), t
