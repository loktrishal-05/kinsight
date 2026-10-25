"""Verifier (spec section 7): seven checks, deterministic. Any failure stops the draft."""
from __future__ import annotations

import re
from collections.abc import Callable
from pathlib import Path

import yaml
from pydantic import BaseModel

from services.genetics import CoupleAssessment, Panel

from .render import SLOT, DraftExplanation, fmt_percent, render_draft, slot_value

WORDING = Path(__file__).resolve().parents[2] / "configs" / "wording.yaml"


class VerifyReport(BaseModel):
    ok: bool
    errors: list[str] = []
    readability: float | None = None


def load_wording(path: Path = WORDING) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _syllables(w: str) -> int:
    return max(1, len(re.findall(r"[aeiouy]+", w.lower())) - (1 if w.lower().endswith("e") else 0))


def fk_grade(text: str) -> float:
    sents = [s for s in re.split(r"[.!?]+", text) if s.strip()] or [text]
    words = re.findall(r"[A-Za-z']+", text) or ["a"]
    return 0.39 * len(words) / len(sents) + 11.8 * sum(map(_syllables, words)) / len(words) - 15.59


def max_sentence_words(text: str) -> int:
    return max((len(s.split()) for s in re.split(r"[.!?؟؛]+", text) if s.strip()), default=0)


def required_ids(draft: DraftExplanation, assessment: CoupleAssessment, templates: dict) -> set[str]:
    tset = templates[(draft.language, draft.reading_level)]
    need = {"fictional_notice"}
    for r in draft.blocks:
        if r.block_id in tset:
            need |= set(tset[r.block_id].must_include_ids)
    if assessment.tier == 3:
        need.add("counsellor_review")
    return need


def verify(draft: DraftExplanation, assessment: CoupleAssessment, panel: Panel, templates: dict,
           wording: dict) -> VerifyReport:
    errs: list[str] = []
    tset = templates.get((draft.language, draft.reading_level))
    if tset is None:
        return VerifyReport(ok=False, errors=["schema: unknown language or level"])
    ids = [r.block_id for r in draft.blocks]
    # 1. allow-list and finding links
    for r in draft.blocks:
        if r.block_id not in tset:
            errs.append(f"allow_list: unknown block {r.block_id}")
            continue
        b = tset[r.block_id]
        if b.slots and (r.finding_index is None or not 0 <= r.finding_index < len(assessment.findings)):
            errs.append(f"allow_list: {r.block_id} needs a valid finding")
        elif b.slots:
            fid = b.applies_when.get("formula_id")
            f = assessment.findings[r.finding_index]
            if fid and f.formula_id not in ([fid] if isinstance(fid, str) else fid):
                errs.append(f"allow_list: {r.block_id} does not match finding formula {f.formula_id}")
    if errs:
        return VerifyReport(ok=False, errors=errs)
    # 2. mandatory present, forbidden absent
    for need in required_ids(draft, assessment, templates):
        if need not in ids:
            errs.append(f"mandatory: missing {need}")
    forbidden = {x for r in draft.blocks for x in tset[r.block_id].forbidden_ids}
    errs += [f"forbidden: {x}" for x in forbidden & set(ids)]
    # every finding must be explained
    covered = {r.finding_index for r in draft.blocks if r.finding_index is not None}
    if "residual_note" in ids:  # one summary block covers every residual (no-change) figure of a related couple
        covered |= {i for i, f in enumerate(assessment.findings) if f.formula_id == "ar_both_not_detected"}
    errs += [f"coverage: finding {i} not explained" for i in range(len(assessment.findings)) if i not in covered]
    rendered = render_draft(draft, assessment, panel, templates)
    for r, rb in zip(draft.blocks, rendered):
        b = tset[r.block_id]
        # 3. every rendered number equals the engine's value
        for spec, shown in zip(b.slots.values(), rb.slot_values):
            if shown != slot_value(spec, assessment, panel, draft.language, r.finding_index):
                errs.append(f"number: {r.block_id} slot differs from engine")
        if r.text_override is not None:
            for v in rb.slot_values:
                if v not in r.text_override:
                    errs.append(f"fact_token: {r.block_id} override dropped {v}")
        # 4. no digit outside a rendered slot
        if re.search(r"\d", rb.skeleton.replace(SLOT, "")):
            errs.append(f"digit_outside_slot: {r.block_id}")
    # 5. banned phrases
    full = " ".join(rb.text for rb in rendered)
    low = full.lower()
    errs += [f"banned_phrase: {p}" for p in wording["banned"][draft.language] if p in low]
    # 6. readability
    score = None
    if draft.language == "en":
        score = max(fk_grade(full), *(fk_grade(rb.text) for rb in rendered))
        if score > wording["readability"]["en_max_grade"][draft.reading_level]:
            errs.append(f"readability: grade {score:.1f} above band")
    else:
        score = float(max_sentence_words(full))
        if score > wording["readability"]["ar_max_sentence_words"][draft.reading_level]:
            errs.append(f"readability: sentence of {int(score)} words above band")
    return VerifyReport(ok=not errs, errors=errs, readability=score)


def verify_mode_b(original: str, rewritten: str, judge: Callable[[str, str], bool]) -> bool:
    """Mode B (flagged): fact-token preservation plus an entailment judge (a second model). False -> use original."""
    tokens = lambda t: sorted(re.findall(r"\d+%?", t))
    return tokens(original) == tokens(rewritten) and judge(original, rewritten)


__all__ = ["VerifyReport", "fmt_percent", "load_wording", "verify", "verify_mode_b"]
