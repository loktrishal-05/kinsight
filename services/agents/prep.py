"""Pre-counselling preparation (issue 36): deterministic suggestions from a reviewed question bank.

No model call and no scoring: the same inputs always give the same ordered list, and every question is neutral."""
from __future__ import annotations

import yaml

from .render import TEMPLATES

STAGES = ("premarital", "preconception", "pregnant")
CONCERNS = ("family_reaction", "future_children", "cost", "religion", "privacy")
SECTIONS = ("values", "concerns", "questions", "bring")
BRING = ("report", "id", "partner", "family_history")


def bank(lang: str) -> tuple[dict, bool]:
    """The bank for a language, and whether it is a placeholder (English shown until a reviewed translation exists)."""
    path = TEMPLATES / lang / "prep_questions.yaml"
    placeholder = not path.exists()
    if placeholder:
        path = TEMPLATES / "en" / "prep_questions.yaml"
    return yaml.safe_load(path.read_text(encoding="utf-8")), placeholder


def suggest(lang: str, stage: str, concerns: list[str], tier: int | None = None) -> dict:
    """Ordered questions: general, then stage, result tier, then each ticked concern in a fixed order. Ids are stable."""
    if stage not in STAGES:
        raise ValueError("unknown stage")
    data, placeholder = bank(lang)
    groups = [("general", data["general"]), (stage, data["stage"][stage])]
    if tier in (1, 2, 3):
        groups.append((f"tier{tier}", data["tier"][tier]))
    groups += [(c, data["concern"][c]) for c in CONCERNS if c in set(concerns)]
    questions = [{"id": f"{g}_{i}", "text": t} for g, texts in groups for i, t in enumerate(texts)]
    return {"questions": questions, "concerns": data["concerns"], "bring": data["bring"], "placeholder": placeholder}
