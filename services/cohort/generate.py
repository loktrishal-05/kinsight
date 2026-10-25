"""Seeded synthetic cohort generator (spec section 4). All randomness comes from one random.Random(seed)."""
from __future__ import annotations

import gzip
import hashlib
import json
import random
import uuid
from pathlib import Path

from services.genetics import Pedigree, assess_couple, config_hash
from services.genetics.models import Panel
from services.genetics.rules import Rules

from .panel import CohortConfig

AGE_BANDS = ["18-24", "25-29", "30-34", "35-44"]


def _alias(rng: random.Random) -> str:
    return str(uuid.UUID(int=rng.getrandbits(128), version=4))


def _founder_geno(rng, panel: Panel, sex: str) -> dict:
    g = {}
    for c in panel.conditions:
        q = c.carrier_frequency / 2
        n = 1 if (c.inheritance == "XLR" and sex == "male") else 2
        g[c.id] = tuple(rng.random() < q for _ in range(n))
    return g


def child_geno(rng, panel: Panel, sex: str, father: dict, mother: dict) -> dict:
    """Simulate gametes. XLR: sons get the mother's X only; daughters get the father's X plus one of the mother's."""
    g = {}
    for c in panel.conditions:
        m_allele = rng.choice(mother[c.id])
        if c.inheritance == "AR":
            g[c.id] = (rng.choice(father[c.id]), m_allele)
        else:
            g[c.id] = (m_allele,) if sex == "male" else (father[c.id][0], m_allele)
    return g


def is_true_carrier(geno: tuple, inheritance: str) -> bool:
    # AR: heterozygote. XLR: any variant allele (carrier female or hemizygous male).
    return any(geno) if inheritance == "XLR" else sum(geno) == 1


def screen(rng, panel: Panel, geno: dict) -> dict[str, str]:
    out = {}
    for c in panel.conditions:
        hit = is_true_carrier(geno[c.id], c.inheritance) and rng.random() < c.test_sensitivity
        s = "carrier" if hit else "not_detected"
        if rng.random() < c.uncertain_rate:
            s = "uncertain"
        out[c.id] = s
    return out


class _Cohort:
    def __init__(self, cfg: CohortConfig, panel: Panel, rules: Rules):
        self.cfg, self.panel, self.rules = cfg, panel, rules
        self.rng = random.Random(cfg.seed)
        self.ped = Pedigree()
        self.geno: dict[str, dict] = {}
        self.person_rows: list[dict] = []
        self.rel_rows: list[dict] = []
        # cluster -> [(leaf id, gen1 branch, gen2 parent key)]
        self.leaves: dict[int, list[tuple[str, str, str]]] = {}

    def person(self, sex: str, geno: dict) -> str:
        r = self.rng
        pid = _alias(r)
        self.ped.add_person(pid, sex)
        self.geno[pid] = geno
        self.person_rows.append({"id": pid, "sex_at_birth": sex, "language": r.choice(self.cfg.languages),
                                 "reading_level": r.choice(self.cfg.reading_levels),
                                 "age_band": r.choice(AGE_BANDS), "is_synthetic": True})
        return pid

    def founder(self, sex: str) -> str:
        return self.person(sex, _founder_geno(self.rng, self.panel, sex))

    def child(self, f: str, m: str) -> str:
        sex = self.rng.choice(["male", "female"])
        pid = self.person(sex, child_geno(self.rng, self.panel, sex, self.geno[f], self.geno[m]))
        for par in (f, m):
            conf = "known" if self.rng.random() < 0.95 else "reported"
            self.ped.add_parent(pid, par, conf)
            self.rel_rows.append({"type": "parent_of", "a_id": par, "b_id": pid, "confidence": conf})
        return pid

    def marry_in(self, p: str) -> tuple[str, str]:
        sp = self.founder("female" if self.ped.sex[p] == "male" else "male")
        f, m = (p, sp) if self.ped.sex[p] == "male" else (sp, p)
        self.rel_rows.append({"type": "partner_of", "a_id": f, "b_id": m, "confidence": "known"})
        return f, m

    def build_cluster(self, k: int) -> None:
        r = self.rng
        f0, m0 = self.founder("male"), self.founder("female")
        leaves = []
        for b in range(3):  # gen1 children of the founding couple, each with an outside spouse
            f1, m1 = self.marry_in(self.child(f0, m0))
            for _ in range(r.choice([2, 3])):  # gen2
                f2, m2 = self.marry_in(self.child(f1, m1))
                key = f"{b}:{f2}:{m2}"
                for _ in range(r.choice([2, 3])):  # gen3 leaves
                    leaves.append((self.child(f2, m2), str(b), key))
        self.leaves[k] = leaves

    def related_pair(self, first_cousin: bool):
        """Cousins: same gen1 branch -> parents are siblings -> first cousins; else second cousins."""
        for _ in range(50):
            lv = self.leaves[self.rng.randrange(self.cfg.family_clusters)]
            a, b = self.rng.sample(lv, 2)
            if self.ped.sex[a[0]] == self.ped.sex[b[0]] or a[2] == b[2]:
                continue
            if (a[1] == b[1]) == first_cousin:
                return a[0], b[0]
        return None

    def unrelated_pair(self):
        for _ in range(50):
            k1, k2 = self.rng.sample(range(self.cfg.family_clusters), 2)
            a, b = self.rng.choice(self.leaves[k1])[0], self.rng.choice(self.leaves[k2])[0]
            if self.ped.sex[a] != self.ped.sex[b]:
                return a, b
        raise RuntimeError("cannot form unrelated pair")


def _write(out_dir: Path, name: str, rows: list[dict]) -> str:
    out_dir.mkdir(parents=True, exist_ok=True)
    data = "\n".join(json.dumps(r, sort_keys=True) for r in rows).encode()
    p = out_dir / f"{name}.jsonl.gz"
    with open(p, "wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as gz:  # mtime=0: same bytes
        gz.write(data)
    return hashlib.sha256(p.read_bytes()).hexdigest()


def generate(cfg: CohortConfig, panel: Panel, rules: Rules, out_dir: Path | None = None) -> dict:
    co = _Cohort(cfg, panel, rules)
    for k in range(cfg.family_clusters):
        co.build_cluster(k)
    rng, used = co.rng, set()
    couples = []
    fc_p = cfg.first_cousin_share_of_all / cfg.consanguineous_share
    for _ in range(cfg.couples * 20):
        if len(couples) >= cfg.couples:
            break
        pair = None
        if rng.random() < cfg.consanguineous_share:
            pair = co.related_pair(rng.random() < fc_p)
        pair = pair or co.unrelated_pair()
        if used & set(pair):
            continue
        used |= set(pair)
        couples.append(pair)
    results, truth = {}, []
    for pid in sorted(used):
        results[pid] = screen(rng, panel, co.geno[pid])
        truth += [{"person_id": pid, "condition_id": c, "genotype": "".join(str(int(x)) for x in g)}
                  for c, g in co.geno[pid].items()]
    results_rows = [{"person_id": p, "condition_id": c, "status": s, "panel_version": panel.panel_version,
                     "is_synthetic": True} for p in sorted(results) for c, s in results[p].items()]
    couple_rows, phis, consang = [], [], 0
    for i, (a, b) in enumerate(couples):
        asm = assess_couple(co.ped, a, b, results, panel, rules)
        phis.append(asm.kinship_phi)
        consang += asm.kinship_phi > 0
        couple_rows.append({"couple_id": f"CPL_{i:05d}", "person_a": a, "person_b": b,
                            "shared_conditions": [f.condition_id for f in asm.findings],
                            "risk_per_pregnancy": max((f.risk_affected or 0 for f in asm.findings), default=0.0),
                            "inbreeding_f": asm.inbreeding_f, "tier": asm.tier,
                            "engine_version": asm.engine_version, "is_synthetic": True})
    files = {"persons": co.person_rows, "relationships": co.rel_rows, "screening_results": results_rows,
             "couples": couple_rows}
    hashes = {k: _write(out_dir, k, v) for k, v in files.items()} if out_dir else {}
    if out_dir:
        hashes["sim_truth"] = _write(out_dir / "sim_truth", "sim_truth", truth)  # evaluation harness only
    manifest = {"seed": cfg.seed,
                "config_hash": hashlib.sha256(cfg.model_dump_json().encode()).hexdigest()[:16],
                "engine_config_hash": config_hash(panel, rules), "panel_version": panel.panel_version,
                "counts": {k: len(v) for k, v in files.items()} | {"sim_truth": len(truth)},
                "achieved_consanguinity_share": consang / max(len(couples), 1),
                "mean_inbreeding_f": sum(phis) / max(len(phis), 1), "sha256": hashes, "is_synthetic": True}
    if out_dir:
        (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=1, sort_keys=True), encoding="utf-8")
    return manifest
