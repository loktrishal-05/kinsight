"""Copy the service directory into the web app: python scripts/export_services.py"""
import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def export() -> dict:
    data = yaml.safe_load((ROOT / "configs/services.yaml").read_text(encoding="utf-8"))
    for s in data["services"]:
        if not s["sample"] and not (s["source"] and s["last_verified"]):
            raise ValueError(f"{s['id']}: a real service needs a source and a last_verified date")
    return data


if __name__ == "__main__":
    (ROOT / "web/lib/fixtures/services.json").write_text(json.dumps(export(), indent=1) + "\n", encoding="utf-8", newline="\n")
