"""Precompute the what-if scenarios for the web mock, so the browser never computes a risk: python scripts/export_scenarios.py"""
import json
from pathlib import Path

import yaml

from services.cohort.panel import load_panel
from services.genetics.scenarios import scenario
from services.lifecycle import nasab

ROOT = Path(__file__).resolve().parents[1]
RELATIONS = ["none", "second_cousins", "first_cousins_once_removed", "first_cousins", "double_first_cousins", "uncle_niece_or_aunt_nephew"]
PAIRS = {"AR": [("carrier", "carrier"), ("carrier", "untested"), ("carrier", "not_detected"), ("not_detected", "not_detected")],
         "XLR": [("carrier", "not_detected"), ("not_detected", "carrier"), ("not_detected", "not_detected"), ("carrier", "carrier")]}


def build() -> dict:
    phi = {r: nasab.evaluate([r])["phi"] for r in RELATIONS}
    table = {}
    for cond in load_panel().conditions:
        for a, b in PAIRS[cond.inheritance]:
            for rel in RELATIONS:
                runs = [scenario(cond, a, b, phi[rel], n) for n in range(1, 7)]
                table[f"{cond.id}|{a}|{b}|{rel}"] = {
                    "formula": runs[0]["formula_id"], "per": runs[0]["per_pregnancy"], "partner": runs[0]["partner_carrier"],
                    "atLeast": [r["at_least_one"] for r in runs]}
    options = {lang: yaml.safe_load((ROOT / f"templates/{lang}/scenario_options.yaml").read_text(encoding="utf-8"))["options"] for lang in ("en", "ar")}
    return {"table": table, "options": options}


if __name__ == "__main__":
    (ROOT / "web/lib/fixtures/scenarios.json").write_text(json.dumps(build(), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
