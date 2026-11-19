"""The service directory never shows an unverified entry as real, and the web copy matches the config."""
import json
from pathlib import Path

import yaml

from scripts.export_services import export

ROOT = Path(__file__).resolve().parents[2]


def test_entries_are_samples_or_sourced_and_dated():
    for s in yaml.safe_load((ROOT / "configs/services.yaml").read_text(encoding="utf-8"))["services"]:
        assert s["sample"] or (s["source"] and s["last_verified"]), s["id"]
        assert s["type"] in {"confirmatory", "counselling", "primary", "specialist", "support"}


def test_web_copy_matches_the_config():
    web = json.loads((ROOT / "web/lib/fixtures/services.json").read_text(encoding="utf-8"))
    assert web == json.loads(json.dumps(export())), "run: python scripts/export_services.py"
