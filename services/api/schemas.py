"""Strict, bounded API contracts. All output is explicitly fictional."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Alias = Annotated[str, Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")]
Scope = Literal[
    "couple_tier_only",
    "couple_summary",
    "condition_findings",
    "relationship_only",
    "quiz_status",
    "couple_pooling",
]
Purpose = Literal["own_care", "couple_planning", "counselling", "family_notification"]


class StrictModel(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", allow_inf_nan=False)


class Fictional(StrictModel):
    is_synthetic: Literal[True] = True


class PersonaRequest(StrictModel):
    persona: Alias


class TokenResponse(Fictional):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class Profile(Fictional):
    id: Alias
    language: Literal["ar", "en"]
    reading_level: Literal["basic", "standard"]


class GrantRequest(StrictModel):
    grantee_id: Alias
    resource_type: Literal["result", "pedigree", "couple", "case"]
    resource_id: Alias
    scope: Scope
    fields: Annotated[list[Alias], Field(min_length=1, max_length=20)]
    condition_ids: Annotated[list[Alias], Field(max_length=100)] = []
    purpose: Purpose
    expires_at: float
    text_shown: Annotated[str, Field(min_length=1, max_length=4000)]


class ConsentView(Fictional):
    id: Alias
    grantee_id: Alias
    scope: Scope
    purpose: Purpose
    expires_at: float
    revoked_at: float | None


class InviteRequest(StrictModel):
    recipient_id: Alias
    scope: Literal["couple_summary", "couple_tier_only", "relationship_only"]


class RespondRequest(StrictModel):
    accepted: bool
    scope: Literal["couple_summary", "couple_tier_only", "relationship_only"]


class Status(Fictional):
    status: str


class InvitationView(Fictional):
    id: Alias
    scope: Scope
    status: str


class ResponseView(Fictional):
    status: str
    couple_id: Alias | None = None


class Result(Fictional):
    condition_id: Alias
    status: Literal["carrier", "not_detected", "uncertain"]
    panel_version: str


class Explanation(Fictional):
    blocks: list[str]
    released: Literal[True]


class Relationship(StrictModel):
    a_id: Alias
    b_id: Alias
    type: Literal["parent_of", "partner_of"]
    confidence: Literal["known", "reported", "uncertain"]
    confirmed: bool = False


class PedigreeInput(StrictModel):
    relationships: Annotated[list[Relationship], Field(max_length=200)]


class PedigreeView(Fictional):
    relationships: list[Relationship]
    warnings: list[str]


class Answers(StrictModel):
    answers: Annotated[list[Annotated[int, Field(ge=0, le=10)]], Field(min_length=1, max_length=5)]


class CounsellorDecision(StrictModel):
    decision: Literal["approve", "edit", "hold"]
    reason_code: Alias
    approved_block_ids: Annotated[list[Alias], Field(max_length=30)] = []


class ReferralEvent(StrictModel):
    event: Literal[
        "counselling_requested",
        "counselling_done",
        "confirmatory_requested",
        "confirmatory_done",
        "specialist_referral_requested",
        "specialist_referral_done",
        "closed",
    ]
    evidence_code: Alias


class Chat(StrictModel):
    text: Annotated[str, Field(min_length=1, max_length=2000)]


class Finding(StrictModel):
    condition_id: Alias
    inheritance: Literal["AR", "XLR"]
    status_a: Literal["carrier", "not_detected", "uncertain"]
    status_b: Literal["carrier", "not_detected", "uncertain"]
    formula_id: Alias
    inputs: dict[str, float]
    risk_affected: Annotated[float, Field(ge=0, le=1)] | None
    note_codes: list[Alias]


class CoupleFinding(StrictModel):
    condition_id: Alias
    risk_affected: Annotated[float, Field(ge=0, le=1)] | None
    note_codes: list[Alias]


class CoupleView(Fictional):
    tier: Literal[1, 2, 3] | None = None
    shared_conditions: list[Alias] | None = None
    engine_version: str | None = None
    findings: list[CoupleFinding] | None = None


class ReferralStep(StrictModel):
    state: Alias
    owner_id: Alias
    due_at: float


class CaseView(Fictional):
    status: Alias | None = None
    referral: list[ReferralStep] | None = None
    quiz: list[Alias] | None = None
    brief: list[Alias] | None = None


class AggregateView(Fictional):
    cells: dict[str, float | None]
    budget_remaining: float


class Evaluation(Fictional):
    metrics: dict[str, float]
