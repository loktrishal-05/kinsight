"""Notification texts never contain health information, and the web copy matches the config."""
import json
from pathlib import Path

from scripts.export_notifications import export
from services.cohort.panel import load_panel

ROOT = Path(__file__).resolve().parents[2]
WORDS = {"carrier", "gene", "variant", "result", "risk", "condition", "disorder", "affected", "positive", "negative",
         "diagnos", "tier", "pregnan", "test result", "mutation", "chance"}


def texts() -> list[str]:
    data = export()
    return [data["title"], *(t["body"] for t in data["types"].values())]


def test_every_notification_is_free_of_health_information():
    panel = load_panel()
    names = {n.lower() for c in panel.conditions for n in (c.id, c.label_en)}
    for text in texts():
        low = text.lower()
        assert not any(w in low for w in WORDS | names), text


def test_the_expected_triggers_exist():
    assert set(export()["types"]) == {"lab_status", "counsellor_update", "appointment_reminder", "reclassification_reviewed", "cascade_reminder"}


def test_web_copy_matches_the_config():
    web = json.loads((ROOT / "web/lib/fixtures/notifications.json").read_text(encoding="utf-8"))
    assert web == export(), "run: python scripts/export_notifications.py"
