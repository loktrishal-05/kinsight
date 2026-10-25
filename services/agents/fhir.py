"""FHIR-style referral status for synthetic cases (P5-9). Function only: no route exposes it (no-export rule).

Resource and code names checked against FHIR R4 ServiceRequest (status: draft | active | on-hold | revoked |
completed | entered-in-error | unknown; intent: order; category/code left generic). Synthetic data only.
"""
from __future__ import annotations

from .flags import enabled
from .referral import ReferralState

STATUS = {"result_released": "draft", "counselling_requested": "active", "counselling_done": "completed",
          "confirmatory_requested": "active", "confirmatory_done": "completed",
          "specialist_referral_requested": "active", "specialist_referral_done": "completed", "closed": "completed"}


def referral_bundle(case_id: str, rs: ReferralState) -> dict:
    if not enabled("fhir_export"):
        raise PermissionError("fhir_export flag is off")
    entries = [{"resource": {
        "resourceType": "ServiceRequest", "id": f"{case_id}-{i}", "status": STATUS[e.to_state], "intent": "order",
        "code": {"text": e.to_state}, "subject": {"display": "synthetic case"},
        "authoredOn": e.at.isoformat(), "occurrenceDateTime": e.due.isoformat() if e.due else None,
        "meta": {"tag": [{"system": "https://kinsight.example/tags", "code": "synthetic"}]}}}
        for i, e in enumerate(rs.events)]
    return {"resourceType": "Bundle", "type": "collection", "entry": entries}
