"""Tier rules, validated from configs/escalation.yaml (loaded by the caller)."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class Tier3(BaseModel):
    model_config = ConfigDict(extra="forbid")
    both_carry_same: bool = True
    uncertain_on_condition_tiers: list[int] = [2, 3]
    carrier_with_related_partner: bool = True
    xlr_carrier: bool = True
    carrier_of_condition_tiers: list[int] = [3]


class Tier2(BaseModel):
    model_config = ConfigDict(extra="forbid")
    one_carrier_unrelated_condition_tiers: list[int] = [2]


class Rules(BaseModel):
    # referral / service_window_days are consumed by the agents package
    model_config = ConfigDict(extra="allow")
    related_phi_min: float = 0.0
    emit_residual_unrelated: bool = False
    tier3: Tier3 = Tier3()
    tier2: Tier2 = Tier2()
