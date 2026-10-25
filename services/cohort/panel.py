"""Config loaders with schema validation (P1-1). Invalid configs raise with a clear message."""
from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, ValidationError

from services.genetics import Panel, Rules

CONFIGS = Path(__file__).resolve().parents[2] / "configs"


class ConfigError(ValueError):
    pass


class CohortConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    seed: int
    family_clusters: int
    generations: int
    consanguineous_share: float
    first_cousin_share_of_all: float
    couples: int
    languages: list[str]
    reading_levels: list[str]


def _load(name: str, model, path: Path | None = None):
    p = path or CONFIGS / name
    try:
        return model.model_validate(yaml.safe_load(p.read_text(encoding="utf-8")))
    except (ValidationError, yaml.YAMLError) as e:
        raise ConfigError(f"{p.name}: {e}") from e


def load_panel(path: Path | None = None) -> Panel:
    return _load("panel.yaml", Panel, path)


def load_rules(path: Path | None = None) -> Rules:
    return _load("escalation.yaml", Rules, path)


def load_cohort_config(path: Path | None = None) -> CohortConfig:
    return _load("cohort.yaml", CohortConfig, path)
