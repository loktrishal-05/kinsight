"""PRD FR-015 / III.7: deterministic escalation rules and multi-gene risk. No model, no network, no randomness.

Works on gene-level facts for a couple. Individual findings (homozygous, X-linked) are returned only as COUNTS so a
partner view can never learn which gene the other person carries.
"""
from __future__ import annotations

from dataclasses import dataclass

from . import cfg


@dataclass(frozen=True)
class GeneCall:
    gene: str
    inheritance: str          # AR | XLR
    zygosity: str             # HET | HOM | HEMI
    acmg_class: int           # only 4 and 5 count at premarital screening (VUS suppressed)
    requires_orthogonal: bool = False
    orthogonal_verified: bool = False
    allele: str = ""          # opaque allele id; equal ids = same variant


def combined_risk_pct(shared: int) -> float:
    """P(affected by at least one shared gene) = 1 - 0.75**m (independent loci), as a percentage."""
    return round((1 - 0.75**shared) * 100, 2) if shared > 0 else 0.0


def evaluate(a: list[GeneCall], b: list[GeneCall], phi: float, *, pregnant_days: int | None = None,
             dcs: float | None = None, teach_back_failures: int = 0) -> dict:
    t = cfg()["triage"]
    ar_a = {c.gene: c for c in a if c.inheritance == "AR" and c.zygosity == "HET" and c.acmg_class in (4, 5)}
    ar_b = {c.gene: c for c in b if c.inheritance == "AR" and c.zygosity == "HET" and c.acmg_class in (4, 5)}
    shared = sorted(ar_a.keys() & ar_b.keys())
    private = lambda cs: sum(1 for c in cs if c.zygosity in {"HOM", "HEMI"} or c.inheritance == "XLR")  # noqa: E731
    unconfirmed = [g for g in shared if any(
        c[g].requires_orthogonal and not c[g].orthogonal_verified for c in (ar_a, ar_b))]
    rules: list[str] = []
    if pregnant_days is not None and pregnant_days < cfg()["gestation"]["day_120"] and shared:
        rules.append("RULE-07_PREGNANCY_WINDOW")
    if unconfirmed:
        rules.append("RULE-03_ORTHOGONAL_HOLD")
    if len(shared) >= 2:
        rules.append("RULE-02_MULTI_GENE")
    elif len(shared) == 1:
        rules.append("RULE-01_SINGLE_GENE")
    if shared and any(ar_a[g].allele != ar_b[g].allele for g in shared):
        rules.append("RULE-05_COMPOUND_HET")  # same gene, different alleles: exact-allele matching would miss it
    if private(a) or private(b):
        rules.append("RULE-04_PRIVATE_FINDING")  # routed to the individual's own vault, never the couple view
    if phi >= t["consang_phi_min"] and phi > 0:
        rules.append("RULE-06_CONSANGUINITY_REFLEX")
    if (dcs is not None and dcs > cfg()["instruments"]["dcs_flag_above"]) or teach_back_failures >= 2:
        rules.append("RULE-08_DECISIONAL_SUPPORT")
    gc = {"RULE-01_SINGLE_GENE", "RULE-02_MULTI_GENE", "RULE-03_ORTHOGONAL_HOLD", "RULE-04_PRIVATE_FINDING",
          "RULE-05_COMPOUND_HET", "RULE-07_PREGNANCY_WINDOW", "RULE-08_DECISIONAL_SUPPORT"}
    sla = (t["emergency_hours"] if "RULE-07_PREGNANCY_WINDOW" in rules
           else t["urgent_hours"] if gc & set(rules) else None)
    return {
        "tier": 2 if gc & set(rules) else 1,
        "rules": rules,
        "shared_genes": shared,                    # intersection only
        "combined_risk_pct": combined_risk_pct(len(shared)),
        "hold_release": bool(unconfirmed),          # no certificate until orthogonal confirmation is attached
        "private_counts": {"a": private(a), "b": private(b)},
        "sla_hours": sla,
    }
