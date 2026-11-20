from pathlib import Path

import pytest

from services.api.routes.lab_feed import EVENT
from services.integrations.hl7_lab import decode_event

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "hl7"


def fixture(name):
    return (FIXTURES / name).read_bytes()


def test_order_status_and_result_revisions():
    order = EVENT.validate_python(decode_event(fixture("collected.orm")))
    assert (order.subject_id, order.stage) == ("synthetic-a", 2)
    initial = EVENT.validate_python(decode_event(fixture("screening.oru"))).report
    corrected = EVENT.validate_python(decode_event(fixture("correction.oru"))).report
    assert initial.resource.issued == "2026-01-01T10:00:00+00:00"
    assert (initial.revision, initial.resource.status, initial.findings) == (1, "final", {"COND_001": "carrier"})
    assert (corrected.revision, corrected.resource.status, corrected.findings) == (2, "corrected", {"COND_001": "uncertain"})


@pytest.mark.parametrize(("old", "new"), [
    (b"ORU^R01", b"ADT^A01"),
    (b"synthetic-a^^^KINSIGHT^PI", b"synthetic-b^^^KINSIGHT^PI"),
    (b"synthetic-a^^^KINSIGHT^PI", b"synthetic-a^^^KINSIGHT^PI||Fixture^Name"),
    (b"COND_001^^L", b"COND_999^^L"),
    (b"CARRIER^^L", b"CARRIER^^L~ABSENT^^L"),
    (b"ZKS|1", b"ZKS|01"),
    (b"20260101100000+0000", b"20261301100000+0000"),
])
def test_invalid_or_out_of_profile_fields_are_rejected(old, new):
    raw = fixture("screening.oru")
    assert old in raw
    with pytest.raises(ValueError):
        EVENT.validate_python(decode_event(raw.replace(old, new)))
