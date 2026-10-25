"""Export rich fictional fixtures for the web app from the real engine, templates and committed demo cohort.

Nothing here is typed by hand: scenarios are assessed by services.genetics, explanations are rendered and verified by
services.agents, statistics come from data/demo. Run: python scripts/export_web_fixtures.py  -> web/lib/fixtures/data.json
"""
import gzip
import hashlib
import json
import pathlib
import random
import statistics
import sys
from collections import Counter, defaultdict

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from services.agents.quiz import build_quiz  # noqa: E402
from services.agents.render import load_templates, render_draft, select_blocks  # noqa: E402
from services.agents.verify import load_wording, verify  # noqa: E402
from services.analytics.capacity import POLICIES, simulate  # noqa: E402
from services.cohort.panel import CONFIGS, load_panel, load_rules  # noqa: E402
from services.genetics import Pedigree, assess_couple  # noqa: E402

OUT = ROOT / "web/lib/fixtures/data.json"
PANEL, RULES, TPL, WORD = load_panel(), load_rules(), load_templates(), load_wording()
COND = {c.id: c for c in PANEL.conditions}
AR1 = next(c for c in PANEL.conditions if c.inheritance == "AR" and c.counselling_tier == 1)
AR2 = next(c for c in PANEL.conditions if c.inheritance == "AR" and c.counselling_tier == 2)
AR3 = next(c for c in PANEL.conditions if c.inheritance == "AR" and c.counselling_tier == 3)
XL = next(c for c in PANEL.conditions if c.inheritance == "XLR")


def kin(depth: int) -> Pedigree:
    """Partners 'a' (male) and 'b' (female) who are cousins: depth 2 = first cousins, 3 = second cousins."""
    p = Pedigree()
    p.add_person("gf", "male"); p.add_person("gm", "female")
    tips = []
    for side, sex in (("x", "male"), ("y", "female")):
        prev = ("gf", "gm")
        for g in range(depth):
            pid = ("a" if side == "x" else "b") if g == depth - 1 else f"{side}{g}"
            p.add_person(pid, sex)
            p.add_parent(pid, prev[0]); p.add_parent(pid, prev[1])
            if g < depth - 1:
                sp = f"{side}{g}s"
                p.add_person(sp, "female" if sex == "male" else "male")
                prev = (pid, sp) if sex == "male" else (sp, pid)
        tips.append(pid)
    return p


def unrelated() -> Pedigree:
    p = Pedigree()
    p.add_person("a", "male"); p.add_person("b", "female")
    return p


SCEN = [  # id, title en/ar, blurb en/ar, pedigree, statuses {cond: (a, b)}
    ("s1", ("Not related, nothing found", "غير أقارب، لم يُعثر على شيء"),
     ("A couple who are not related. No changes were found in either partner.", "زوجان ليسا أقارب. لم يُعثر على تغيرات لدى أي منهما."),
     unrelated(), {}),
    ("s2", ("Not related, one partner carries a change", "غير أقارب، أحدهما يحمل تغيرا"),
     ("One partner carries a change in a gene linked to one condition. The other partner has none found.", "أحد الشريكين يحمل تغيرا في جين مرتبط بحالة واحدة. لم يُعثر على تغير لدى الآخر."),
     unrelated(), {AR2.id: ("carrier", "not_detected")}),
    ("s3", ("First cousins, both carry the same change", "أبناء عمومة، كلاهما يحمل التغير نفسه"),
     ("First cousins who both carry a change in the same gene. A counsellor reviews this together with them.", "ابنا عمومة يحملان تغيرا في الجين نفسه. يراجع مستشار ذلك معهما."),
     kin(2), {AR2.id: ("carrier", "carrier"), AR1.id: ("carrier", "not_detected")}),
    ("s4", ("First cousins, one partner carries a change", "أبناء عمومة، أحدهما يحمل تغيرا"),
     ("First cousins where one partner carries a change. Being related can raise the chance a little.", "ابنا عمومة يحمل أحدهما تغيرا. القرابة قد ترفع الفرصة قليلا."),
     kin(2), {AR2.id: ("carrier", "not_detected")}),
    ("s5", ("A result that is not clear", "نتيجة غير واضحة"),
     ("One test came back unclear. No chance can be given until a counsellor helps work out the next step.", "ظهر فحص واحد غير واضح. لا يمكن إعطاء نسبة حتى يساعد مستشار في الخطوة التالية."),
     unrelated(), {AR2.id: ("uncertain", "not_detected")}),
    ("s6", ("X-linked change in the mother", "تغير على الكروموسوم إكس لدى الأم"),
     ("The mother carries a change on the X chromosome. Sons and daughters are affected differently.", "تحمل الأم تغيرا على الكروموسوم إكس. يختلف التأثير على الأبناء والبنات."),
     unrelated(), {XL.id: ("not_detected", "carrier")}),
    ("s7", ("Second cousins, nothing found", "أبناء أعمام من الدرجة الثانية، لم يُعثر على شيء"),
     ("Second cousins with no changes found. The estimate says relatedness can raise the true chance a little.", "قريبان من الدرجة الثانية دون تغيرات. يشير التقدير إلى أن القرابة قد ترفع الفرصة الحقيقية قليلا."),
     kin(3), {AR3.id: ("not_detected", "not_detected")}),
]


def person_results(sid_results: dict, who: int) -> list[dict]:
    rows = [{"condition_id": c, "status": s[who]} for c, s in sid_results.items()]
    spare = [c for c in PANEL.conditions if c.id not in sid_results and c.inheritance == "AR"][:2]
    rows += [{"condition_id": c.id, "status": "not_detected"} for c in spare]
    return rows


def scenarios() -> list[dict]:
    out = []
    for sid, title, blurb, ped, st in SCEN:
        res = {"a": {c.id: "not_detected" for c in PANEL.conditions}, "b": {c.id: "not_detected" for c in PANEL.conditions}}
        for cid, (sa, sb) in st.items():
            res["a"][cid], res["b"][cid] = sa, sb
        asm = assess_couple(ped, "a", "b", res, PANEL, RULES)
        expl, quiz = {}, {}
        for (lang, level) in TPL:
            d = select_blocks(asm, lang, level, TPL)
            assert verify(d, asm, PANEL, TPL, WORD).ok, (sid, lang, level)
            expl[f"{lang}/{level}"] = [b.text for b in render_draft(d, asm, PANEL, TPL)]
        for lang in ("en", "ar"):
            qz = build_quiz(asm, lang)
            quiz[lang] = [{"id": q.id, "text": q.text, "options": [o.model_dump() for o in q.options], "answer": qz.key[q.id]}
                          for q in qz.questions]
        out.append({
            "id": sid, "title": {"en": title[0], "ar": title[1]}, "blurb": {"en": blurb[0], "ar": blurb[1]},
            "tier": asm.tier, "related": asm.kinship_phi > 0, "kinship_phi": asm.kinship_phi,
            "engine_version": asm.engine_version, "config_hash": asm.config_hash,
            "findings": [{"condition_id": f.condition_id, "formula_id": f.formula_id, "risk_affected": f.risk_affected,
                          "note_codes": f.note_codes, "inputs": {k: v for k, v in f.inputs.items() if k in ("carrier_child", "daughter_carrier", "son_affected")},
                          "inheritance": f.inheritance, "status_a": f.status_a, "status_b": f.status_b} for f in asm.findings],
            "results_a": person_results(st, 0), "results_b": person_results(st, 1),
            "explanations": expl, "quiz": quiz,
        })
    return out


def rows(name: str, sub: str = "") -> list[dict]:
    with gzip.open(ROOT / "data/demo" / sub / f"{name}.jsonl.gz", "rt", encoding="utf-8") as fh:
        return [json.loads(x) for x in fh.read().splitlines()]


def cohort_stats() -> dict:
    persons = {p["id"]: p for p in rows("persons")}
    couples = rows("couples")
    screening = rows("screening_results")
    carriers = Counter(r["condition_id"] for r in screening if r["status"] == "carrier")
    uncertain = Counter(r["condition_id"] for r in screening if r["status"] == "uncertain")
    tier_lang: dict[str, Counter] = defaultdict(Counter)
    for c in couples:
        tier_lang[persons[c["person_a"]]["language"]][c["tier"]] += 1
    return {
        "persons": len(persons), "couples": len(couples), "conditions": len(PANEL.conditions),
        "carriers": [{"condition_id": c.id, "label_en": c.label_en, "label_ar": c.label_ar, "inheritance": c.inheritance,
                      "tier": c.counselling_tier, "carriers": carriers.get(c.id, 0), "uncertain": uncertain.get(c.id, 0)}
                     for c in PANEL.conditions],
        "tiers": dict(Counter(c["tier"] for c in couples)),
        "tiers_by_language": {k: dict(v) for k, v in tier_lang.items()},
        "related_share": sum(c["inbreeding_f"] > 0 for c in couples) / len(couples),
        "manifest": json.loads((ROOT / "data/demo/manifest.json").read_text()),
    }


def queue(couples_n: int = 26) -> list[dict]:
    persons = {p["id"]: p for p in rows("persons")}
    couples = rows("couples")
    rng = random.Random(20261025)
    picks = rng.sample(couples, couples_n)
    out = []
    for c in sorted(picks, key=lambda c: -c["tier"]):
        h = int(hashlib.sha256(c["couple_id"].encode()).hexdigest(), 16)
        tier = c["tier"]
        status = (["awaiting_counsellor"] * 5 + ["released", "awaiting_user", "tracking", "closed"])[h % 9] if tier == 3 else \
                 (["awaiting_user", "tracking", "released", "closed"])[h % 4]
        due = (h % 21) - 6  # days from today; negative = overdue
        pa = persons[c["person_a"]]
        out.append({"id": c["couple_id"].replace("CPL_", "C-"), "tier": tier, "status": status, "due_days": due,
                    "language": pa["language"], "reading_level": pa["reading_level"], "age_band": pa["age_band"],
                    "related": c["inbreeding_f"] > 0, "conditions": len(c["shared_conditions"]),
                    "step": ["result_released", "counselling_requested", "counselling_done", "confirmatory_requested",
                             "confirmatory_done", "specialist_referral_requested"][h % 6] if status in ("tracking", "closed") else "result_released"})
    return out


def capacity() -> dict:
    cfg = yaml.safe_load((CONFIGS / "capacity.yaml").read_text())
    mix = {int(k): v for k, v in cfg["tier_mix"].items()}
    grid, weekly = [], None
    for slots in range(8, 26, 2):
        for pol in POLICIES:
            r = simulate(pol, seed=cfg["seed"], weeks=cfg["weeks"], arrivals_per_week=cfg["arrivals_per_week"], tier_mix=mix,
                         counsellors_slots_per_week=slots, service_window_days=cfg["service_window_days"])
            grid.append({"slots": slots, "policy": pol, "median_days": r["median_days"], "p95_days": r["p95_days"],
                         "tier3_within_window": r["tier3_within_window"]})
            if slots == cfg["counsellor_slots_per_week"] and pol == "fcfs":
                weekly = r["weekly"]
    return {"assumptions": cfg, "grid": grid, "weekly": weekly, "label": "Illustrative simulation on stated assumptions; not a forecast."}


def comprehension() -> dict:
    """Scripted pipeline-test inputs (clearly labelled): they exercise the analytics, they are not evidence about people."""
    rng = random.Random(7)
    out = []
    for lang in ("en", "ar"):
        for level in ("basic", "standard"):
            for band in ("18-24", "25-29", "30-34", "35-44"):
                n = rng.randint(14, 40)
                base = {"basic": 0.74, "standard": 0.84}[level] - (0.06 if lang == "ar" else 0)
                out.append({"language": lang, "level": level, "age_band": band, "n": n,
                            "pass_rate": round(100 * min(0.97, max(0.4, rng.gauss(base, 0.04))), 1)})
    by = defaultdict(list)
    for r in out:
        by[(r["language"], r["level"])].append(r["pass_rate"])
    rates = [statistics.mean(v) for v in by.values()]
    return {"cells": out, "gap_points": round(max(rates) - min(rates), 1), "target_gap_points": 10,
            "label": "Scripted test inputs for the analytics pipeline, not evidence about people."}


def build() -> dict:
    return {"label": "All people and results are fictional.", "scenarios": scenarios(), "cohort": cohort_stats(),
            "queue": queue(), "capacity": capacity(), "comprehension": comprehension()}


def redteam() -> list[dict]:
    """The 109-prompt red-team set, for the TypeScript assistant's parity test."""
    return yaml.safe_load((ROOT / "tests/redteam/prompts.yaml").read_text(encoding="utf-8"))["prompts"]


def main() -> None:
    (ROOT / "web/tests/fixtures").mkdir(parents=True, exist_ok=True)
    (ROOT / "web/tests/fixtures/redteam.json").write_text(json.dumps(redteam(), ensure_ascii=False, indent=1), encoding="utf-8")
    data = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB); scenarios: " +
          ", ".join(f"{s['id']}=tier{s['tier']}" for s in data["scenarios"]))


if __name__ == "__main__":
    main()
