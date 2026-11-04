"""Lifecycle features from the Silah-Genomics master PRD. Pure, deterministic, synthetic-only; state is injected."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml

CONFIG = Path(__file__).resolve().parents[2] / "configs" / "lifecycle.yaml"


@lru_cache
def cfg() -> dict:
    return yaml.safe_load(CONFIG.read_text(encoding="utf-8"))
