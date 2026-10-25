"""Neutral options explorer (P5-2): generic service types only, equal prominence, no scoring or steering."""
from __future__ import annotations

import yaml

from .flags import enabled
from .render import TEMPLATES


def _load() -> dict:
    return yaml.safe_load((TEMPLATES / "options.yaml").read_text(encoding="utf-8"))


def options(lang: str) -> list[dict]:
    """Same fields for every option; fixed id order (never by tier, result or popularity). Empty when flagged off."""
    if not enabled("options_explorer"):
        return []
    return [{"id": o["id"], **o[lang]} for o in sorted(_load()["options"], key=lambda o: o["id"])]


def values_questions(lang: str) -> list[dict]:
    if not enabled("values_questions"):
        return []
    return [{"id": q["id"], "text": q[lang]} for q in _load()["values_questions"]]
