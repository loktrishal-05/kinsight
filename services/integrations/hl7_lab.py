"""Map the opt-in synthetic HL7 v2.5.1 profile into the signed lab event model."""

import re
from datetime import datetime

import hl7
from hl7.exceptions import HL7Exception

STATUS = {"F": "final", "C": "corrected", "P": "preliminary", "X": "cancelled"}
FINDINGS = {"CARRIER": "carrier", "ABSENT": "not_detected", "UNCERTAIN": "uncertain", "NOT-TESTED": "not_tested"}
PANEL = "KS-CARRIER^Synthetic carrier screen^L"


def field(segment, index):
    return str(segment[index]) if index < len(segment) else ""


def decode_event(body: bytes) -> dict:
    raw = body.decode("ascii").replace("\r\n", "\r").replace("\n", "\r")
    if (
        not raw.startswith("MSH|^~\\&|") or re.search(r"[^\x20-\x7e\r]", raw)
        or "\r\r" in raw or raw.rstrip("\r").count("\r") > 5
    ):
        raise ValueError("Expected plain HL7 v2 with standard separators")
    try:
        message = hl7.parse(raw)
    except HL7Exception as exc:
        raise ValueError("Invalid HL7 message") from exc
    segments = [field(segment, 0) for segment in message]
    if segments[:2] != ["MSH", "PID"] or len(segments) < 4:
        raise ValueError("Expected an HL7 header and patient segment")
    msh, pid = message[:2]
    if (
        field(msh, 3) != "KINSIGHTMOCK" or field(msh, 4) != "SANDBOX"
        or field(msh, 5) != "KINSIGHT" or field(msh, 6) != "SANDBOX"
        or field(msh, 11) != "T" or field(msh, 12) != "2.5.1"
        or not re.fullmatch(r"[A-Za-z0-9-]{1,40}", field(msh, 10))
    ):
        raise ValueError("Expected the KinSight synthetic sending profile")
    patient = re.fullmatch(r"(synthetic-[ab])\^\^\^KINSIGHT\^PI", field(pid, 3))
    if patient is None or any(field(pid, index) for index in range(4, len(pid))):
        raise ValueError("Expected a synthetic patient identifier without demographics")
    subject = patient[1]
    issued = datetime.strptime(field(msh, 7), "%Y%m%d%H%M%S%z").isoformat()
    order = f"{subject}-report^KINSIGHT"
    kind = field(msh, 9)

    if kind in {"ORM^O01", "ORM^O01^ORM_O01"}:
        if segments != ["MSH", "PID", "ORC", "OBR", "ZKS"]:
            raise ValueError("Expected one order and one synthetic tracker stage")
        orc, obr, extension = message[2:]
        stage = field(extension, 1)
        if (
            field(orc, 1) != "SC" or field(orc, 3) != order
            or field(obr, 3) != order or field(obr, 4) != PANEL
            or not re.fullmatch(r"[2-7]", stage) or len(extension) != 2
        ):
            raise ValueError("Invalid synthetic order status")
        return {"kind": "stage", "subject_id": subject, "stage": int(stage)}

    if kind not in {"ORU^R01", "ORU^R01^ORU_R01"}:
        raise ValueError("Unsupported HL7 message type")
    if segments[2] != "OBR" or segments[-1] != "ZKS" or any(segment != "OBX" for segment in segments[3:-1]):
        raise ValueError("Expected one result order with coded observations and a revision")
    obr, extension = message[2], message[-1]
    revision = field(extension, 1)
    status = STATUS.get(field(obr, 25))
    if (
        field(obr, 3) != order or field(obr, 4) != PANEL or status is None
        or not re.fullmatch(r"[1-9][0-9]{0,6}", revision) or len(extension) != 2
    ):
        raise ValueError("Invalid synthetic result order")
    if field(obr, 22):
        issued = datetime.strptime(field(obr, 22), "%Y%m%d%H%M%S%z").isoformat()
    findings = {}
    for index, obx in enumerate(message[3:-1], 1):
        condition = re.fullmatch(r"(COND_00[12])\^\^L", field(obx, 3))
        value = re.fullmatch(r"([A-Z-]+)\^\^L", field(obx, 5))
        interpretation = FINDINGS.get(value[1]) if value else None
        if (
            field(obx, 1) != str(index) or field(obx, 2) != "CE" or field(obx, 4)
            or field(obx, 11) != field(obr, 25)
            or condition is None or condition[1] in findings or interpretation is None
        ):
            raise ValueError("Invalid synthetic observation")
        findings[condition[1]] = interpretation
    if (status == "cancelled" and findings) or (status != "cancelled" and not findings):
        raise ValueError("The observation list does not match the report status")
    return {"kind": "report", "report": {
        "subject_id": subject, "revision": int(revision), "findings": findings,
        "resource": {
            "resourceType": "DiagnosticReport", "id": f"{subject}-report",
            "subject": {"reference": f"Patient/{subject}"},
            "code": {"text": "Synthetic carrier screen"},
            "meta": {"tag": [{"system": "https://kinsight.example/tags", "code": "synthetic"}]},
            "status": status, "issued": issued,
        },
    }}
