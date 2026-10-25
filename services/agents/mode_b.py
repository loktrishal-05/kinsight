"""Mode B (P5-1): constrained rewrite of an approved block for a lower reading level, behind a flag.

The rewriter and judge are injected (models in production, fakes in tests). Anything that adds or drops a number,
uses a banned phrase, or is not judged entailed is discarded and the original approved text is used.
"""
from __future__ import annotations

from typing import Callable

from .flags import enabled
from .verify import load_wording, verify_mode_b


def rewrite_block(original: str, lang: str, rewriter: Callable[[str], str], judge: Callable[[str, str], bool],
                  wording: dict | None = None) -> tuple[str, bool]:
    """Returns (text, accepted). With the flag off, or on any failure, returns the original text."""
    if not enabled("mode_b_rewrite"):
        return original, False
    wording = wording or load_wording()
    try:
        candidate = rewriter(original)
    except Exception:  # a failing model must never block the case
        return original, False
    low = candidate.lower()
    if any(p in low for p in wording["banned"][lang] + wording["stigma"][lang]):
        return original, False
    if not verify_mode_b(original, candidate, judge):
        return original, False
    return candidate, True
