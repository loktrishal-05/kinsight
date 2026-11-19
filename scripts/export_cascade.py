"""Precompute the demo family's cascade tracker for the web mock: python scripts/export_cascade.py"""
import json
from pathlib import Path

from services.api.backend import A, B, DemoBackend
from services.api.cascade_routes import build
from services.cohort.panel import load_panel
from services.genetics.cascade import relatives

ROOT = Path(__file__).resolve().parents[1]


def export() -> dict:
    backend, panel = DemoBackend(), {c.id: c for c in load_panel().conditions}
    out = {}
    for persona, subject in (("person_a", A), ("person_b", B)):
        pedigree = backend.op_pedigree(subject, None, None)
        ped, partners = build(pedigree["people"], pedigree["relationships"])
        conds = []
        for res in backend.op_results(subject, None, None):
            cond = panel[res["condition_id"]]
            if res["status"] != "carrier":
                continue
            rels = [] if cond.inheritance != "AR" else [
                {"id": r["id"], "relation": r["relation"], "degree": r["degree"], "chance": round(r["chance"], 12)}
                for r in relatives(ped, subject, cond.carrier_frequency, partners.get(subject, set()))]
            conds.append({"condition_id": cond.id, "inheritance": cond.inheritance, "needs_counsellor": cond.inheritance != "AR", "relatives": rels})
        out[persona] = conds
    return out


if __name__ == "__main__":
    (ROOT / "web/lib/fixtures/cascade.json").write_text(json.dumps(export(), indent=1) + "\n", encoding="utf-8", newline="\n")
