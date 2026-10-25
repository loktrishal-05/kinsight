"""Engine data models (spec section 5). Pure: no I/O."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Status = Literal["carrier", "not_detected", "uncertain"]
Confidence = Literal["known", "reported", "uncertain"]
Sex = Literal["female", "male"]


class Condition(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    label_en: str
    label_ar: str
    label_ar_status: Literal["placeholder", "approved"] = "placeholder"
    inheritance: Literal["AR", "XLR"]
    carrier_frequency: float = Field(gt=0, lt=1)
    test_sensitivity: float = Field(gt=0, le=1)
    uncertain_rate: float = Field(ge=0, lt=1)
    counselling_tier: Literal[1, 2, 3]


class Panel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    panel_version: str
    conditions: list[Condition]

    def get(self, cid: str) -> Condition:
        return next(c for c in self.conditions if c.id == cid)


class Finding(BaseModel):
    condition_id: str
    inheritance: Literal["AR", "XLR"]
    status_a: Status
    status_b: Status
    formula_id: str
    inputs: dict[str, float]
    risk_affected: float | None  # None when 'needs review'
    note_codes: list[str]


class CoupleAssessment(BaseModel):
    couple_id: str
    inbreeding_f: float
    kinship_phi: float
    findings: list[Finding]
    tier: Literal[1, 2, 3]
    engine_version: str
    panel_version: str
    config_hash: str
