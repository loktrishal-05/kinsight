"""Send recorded stage and report events from a separate synthetic lab process."""

import argparse
import json
import time
from datetime import datetime, timezone
from uuid import uuid4

import httpx

from services.api.auth import secret
from services.api.routes.lab_feed import HL7_PATH, PATH, SIGNING_SECRET, signature
from services.integrations.hl7_lab import PANEL


def demo_report(subject, revision, corrected=False):
    return {
        "subject_id": subject,
        "revision": revision,
        "resource": {
            "resourceType": "DiagnosticReport",
            "id": f"{subject}-report",
            "subject": {"reference": f"Patient/{subject}"},
            "code": {"text": "Synthetic carrier screen"},
            "meta": {"tag": [{"system": "https://kinsight.example/tags", "code": "synthetic"}]},
            "status": "corrected" if corrected else "final",
            "issued": datetime.now(timezone.utc).isoformat(),
        },
        "findings": {"COND_001": "uncertain" if corrected else "carrier"},
    }


def hl7_message(subject, *, stage=None, revision=1):
    order = f"{subject}-report^KINSIGHT"
    issued = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%z")
    kind = "ORM^O01^ORM_O01" if stage is not None else "ORU^R01^ORU_R01"
    segments = [
        f"MSH|^~\\&|KINSIGHTMOCK|SANDBOX|KINSIGHT|SANDBOX|{issued}||{kind}|{uuid4().hex}|T|2.5.1",
        f"PID|1||{subject}^^^KINSIGHT^PI",
    ]
    obr = [""] * 26
    obr[0], obr[1], obr[3], obr[4], obr[22] = "OBR", "1", order, PANEL, issued
    if stage is not None:
        segments.extend([f"ORC|SC||{order}", "|".join(obr), f"ZKS|{stage}"])
    else:
        corrected = revision > 1
        status, value = ("C", "UNCERTAIN") if corrected else ("F", "CARRIER")
        obr[25] = status
        segments.extend(["|".join(obr), f"OBX|1|CE|COND_001^^L||{value}^^L||||||{status}", f"ZKS|{revision}"])
    return ("\r".join(segments) + "\r").encode("ascii")


def send(client, key, event):
    is_hl7 = isinstance(event, bytes)
    path = HL7_PATH if is_hl7 else PATH
    body = event if is_hl7 else json.dumps(event, separators=(",", ":")).encode()
    stamp, delivery = str(int(time.time())), uuid4().hex
    response = client.post(
        path,
        content=body,
        headers={
            "content-type": "application/hl7-v2" if is_hl7 else "application/json",
            "x-lab-timestamp": stamp,
            "x-lab-delivery": delivery,
            "x-lab-signature": signature(key, stamp, delivery, body, path=path),
        },
    )
    if not response.is_success:
        raise SystemExit(
            f"Lab delivery stopped at HTTP {response.status_code}. Check the lab service and current tracker stage."
        )
    print(f"Tracker stage {response.json()['stage']} accepted")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    parser.add_argument("--subject", choices=["synthetic-a", "synthetic-b"], default="synthetic-a")
    parser.add_argument("--start-stage", type=int, choices=range(2, 9), default=2)
    parser.add_argument("--revision", type=int, default=1)
    parser.add_argument("--delay", type=float, default=2)
    parser.add_argument("--format", choices=["json", "hl7"], default="json")
    args = parser.parse_args()
    if not 0 <= args.delay <= 60 or not 1 <= args.revision <= 1_000_000:
        parser.error("Use a delay from 0 to 60 seconds and a valid positive revision")
    key = secret(SIGNING_SECRET)
    with httpx.Client(base_url=args.api, timeout=15) as client:
        for stage in range(args.start_stage, 8):
            event = {"kind": "stage", "subject_id": args.subject, "stage": stage}
            send(client, key, hl7_message(args.subject, stage=stage) if args.format == "hl7" else event)
            time.sleep(args.delay)
        report = demo_report(args.subject, args.revision, corrected=args.revision > 1)
        event = {"kind": "report", "report": report}
        send(client, key, hl7_message(args.subject, revision=args.revision) if args.format == "hl7" else event)


if __name__ == "__main__":
    main()
