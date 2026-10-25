"""Counsellor brief (P5-3): deterministic summary where every statement names the assessment field it comes from."""
from __future__ import annotations

from pydantic import BaseModel

from services.genetics import CoupleAssessment


class Statement(BaseModel):
    text: str
    source: str  # dotted path into CoupleAssessment, e.g. "findings.0.formula_id"


class CounsellorBrief(BaseModel):
    findings: list[Statement]
    flags: list[Statement]
    open_questions: list[Statement]


def build_brief(a: CoupleAssessment) -> CounsellorBrief:
    findings = [Statement(text=f"{f.condition_id}: {f.formula_id}; partner statuses {f.status_a}/{f.status_b}",
                          source=f"findings.{i}.formula_id") for i, f in enumerate(a.findings)]
    flags = [Statement(text=f"Tier {a.tier} (rule text: configs/escalation.yaml)", source="tier")]
    if a.kinship_phi > 0:
        flags.append(Statement(text="Partners are related", source="kinship_phi"))
    for i, f in enumerate(a.findings):
        for n in f.note_codes:
            flags.append(Statement(text=f"{f.condition_id}: {n}", source=f"findings.{i}.note_codes"))
        if f.risk_affected is None:
            flags.append(Statement(text=f"{f.condition_id}: needs review, no figure", source=f"findings.{i}.risk_affected"))
    qs = [Statement(text="Confirm relationship details with the couple", source="kinship_phi")] if a.kinship_phi > 0 else []
    return CounsellorBrief(findings=findings, flags=flags, open_questions=qs)


def resolve(a: CoupleAssessment, path: str):
    """Follow a dotted path; raises if the source does not exist (used by the groundedness test)."""
    cur = a.model_dump()
    for part in path.split("."):
        cur = cur[int(part)] if isinstance(cur, list) else cur[part]
    return cur
