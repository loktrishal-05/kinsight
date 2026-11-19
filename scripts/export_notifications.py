"""Copy the notification texts into the web app: python scripts/export_notifications.py"""
import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def export() -> dict:
    return yaml.safe_load((ROOT / "configs/notifications.yaml").read_text(encoding="utf-8"))


if __name__ == "__main__":
    (ROOT / "web/lib/fixtures/notifications.json").write_text(json.dumps(export(), indent=1) + "\n", encoding="utf-8", newline="\n")
