"""Send synthetic referrals to a configured FHIR R4 sandbox."""

import re
from urllib.parse import urlencode
from uuid import uuid4

from services.cohort.fhir import SYSTEM, TAG

from .fhir_client import read_json

IDENTIFIER = f"{SYSTEM}/referral"
SERVICES = {
    "counselling_requested": "genetic-counselling",
    "confirmatory_requested": "confirmatory-testing",
    "specialist_referral_requested": "specialist-consultation",
}
FHIR_ID = r"[A-Za-z0-9.\-]{1,64}"


def has_identity(resource, key):
    return TAG in resource.get("meta", {}).get("tag", []) and any(
        item.get("system") == IDENTIFIER and item.get("value") == key for item in resource.get("identifier", [])
    )


def submit(client, *, key, subject, stage, due):
    service_urn = f"urn:uuid:{uuid4()}"
    identifier = {"system": IDENTIFIER, "value": key}
    common = {"identifier": [identifier], "meta": {"tag": [TAG]}, "intent": "order"}
    patient = {"identifier": {"system": f"{SYSTEM}/pseudonym", "value": subject}}
    request = {
        "resourceType": "ServiceRequest", **common, "status": "active", "subject": patient,
        "code": {"coding": [{"system": f"{SYSTEM}/service", "code": SERVICES[stage]}]},
        "reasonCode": [{"coding": [{"system": f"{SYSTEM}/referral-reason", "code": "screening-follow-up"}]}],
        "occurrenceDateTime": due,
    }
    task = {
        "resourceType": "Task", **common, "status": "requested", "for": patient,
        "focus": {"reference": service_urn},
    }
    query = urlencode({"identifier": f"{IDENTIFIER}|{key}"})
    response = read_json(client, "", body={"resourceType": "Bundle", "type": "transaction", "entry": [
        {"fullUrl": url, "resource": resource, "request": {
            "method": "POST", "url": resource["resourceType"], "ifNoneExist": query,
        }}
        for url, resource in ((service_urn, request), (f"urn:uuid:{uuid4()}", task))
    ]})
    if response.get("type") != "transaction-response" or len(response.get("entry", [])) != 2:
        raise ValueError("Invalid FHIR transaction response")
    for entry in response["entry"]:
        if entry["response"]["status"].split()[0] not in {"200", "201"}:
            raise ValueError("The FHIR sandbox rejected the referral")
    return status(client, key)


def status(client, key):
    bundle = read_json(client, "Task", params={"identifier": f"{IDENTIFIER}|{key}", "_count": 2})
    entries = bundle.get("entry", [])
    if bundle.get("type") != "searchset" or any(link["relation"] == "next" for link in bundle.get("link", [])):
        raise ValueError("Invalid FHIR Task search")
    if not entries:
        return None
    if len(entries) != 1:
        raise ValueError("Ambiguous FHIR Task")
    task = entries[0]["resource"]
    focus = task.get("focus", {}).get("reference", "")
    if (
        task["resourceType"] != "Task"
        or not has_identity(task, key)
        or not re.fullmatch(FHIR_ID, task.get("id", ""))
        or not re.fullmatch(f"ServiceRequest/{FHIR_ID}", focus)
    ):
        raise ValueError("FHIR Task does not match the referral")
    request_id = focus.split("/")[1]
    request = read_json(client, focus)
    if (request["resourceType"] != "ServiceRequest" or request["id"] != request_id or not has_identity(request, key)
            or not request.get("subject") or request["subject"] != task.get("for")):
        raise ValueError("FHIR ServiceRequest does not match the Task")
    return {"task_id": task["id"], "request_id": request_id, "status": task["status"]}
