from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, Field


class PrivacySettings(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    min_cell: int = Field(ge=2)
    epsilon_per_release: float = Field(gt=0, allow_inf_nan=False)
    epsilon_total: float = Field(gt=0, allow_inf_nan=False)
    token_ttl_seconds: int = Field(gt=0, le=3600)
    consent_max_seconds: int = Field(gt=0)
    rate_limit_requests: int = Field(gt=0)
    rate_limit_window_seconds: int = Field(gt=0)


def settings() -> PrivacySettings:
    path = Path(__file__).resolve().parents[2] / "configs" / "privacy.yaml"
    return PrivacySettings.model_validate(yaml.safe_load(path.read_text(encoding="utf-8")))
