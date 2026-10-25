"""DemoBackend: wires the engine, case graph, analytics and cohort into the API (spec sections 5, 6, 9).

Synthetic only. Every figure comes from services.genetics; explanations are verified template drafts; this module
adds no risk maths. State lives in memory plus a SQLite LangGraph checkpoint file, rebuilt by `reset`.
"""
from __future__ import annotations

import gzip
import json
import sqlite3
import tempfile
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml
from langgraph.checkpoint.sqlite import SqliteSaver
from sqlalchemy import select
from sqlalchemy.orm import Session

from services.agents.case_graph import Deps, build_case_graph, cfg_of, pending, record_referral, resume_case, start_case
from services.agents.copilot import answer as copilot_answer
from services.agents.eval import _couple
from services.agents.quiz import build_quiz
from services.agents.referral import ReferralError, ReferralState, mark_overdue
from services.agents.render import load_glossary, load_templates
from services.analytics.capacity import compare
from services.cohort.panel import CONFIGS, load_panel, load_rules
from services.consent.models import CaseAccess, Couple, Person
from services.genetics import CoupleAssessment, assess_couple

from .interfaces import Unavailable

A, B = "synthetic-a", "synthetic-b"
CASE, COUPLE = "demo-case", "demo-couple"
DEMO_DIR = Path(__file__).resolve().parents[2] / "data" / "demo"
T0 = datetime(2026, 11, 1, tzinfo=timezone.utc)


class DemoBackend:
    def __init__(self) -> None:
        self.panel, self.rules = load_panel(), load_rules()
        self.rules_cfg = yaml.safe_load((CONFIGS / "escalation.yaml").read_text())
        self.case_cfg = yaml.safe_load((CONFIGS / "case.yaml").read_text())
        self.capacity_cfg = yaml.safe_load((CONFIGS / "capacity.yaml").read_text())
        self.templates, self.glossary = load_templates(), load_glossary()
        self.edges: list[dict] = []
        self.offset_days = 0
        self.reset_state()

    # ----- demo case -----------------------------------------------------------------------------
    def reset_state(self) -> None:
        self.offset_days = 0
        tier2 = next(c for c in self.panel.conditions if c.inheritance == "AR" and c.counselling_tier == 2)
        tier1 = next(c for c in self.panel.conditions if c.inheritance == "AR" and c.counselling_tier == 1)
        ped = _couple(True)  # first cousins
        res = {"a": {c.id: "not_detected" for c in self.panel.conditions},
               "b": {c.id: "not_detected" for c in self.panel.conditions}}
        res["a"][tier2.id] = res["b"][tier2.id] = "carrier"
        res["a"][tier1.id] = "carrier"
        self.results = {A: res["a"], B: res["b"]}
        self.assessment = assess_couple(ped, "a", "b", res, self.panel, self.rules)
        self.edges = [{"a_id": A, "b_id": B, "type": "partner_of", "confidence": "known", "confirmed": True}]
        path = Path(tempfile.mkdtemp()) / "cp.sqlite"
        conn = sqlite3.connect(path, check_same_thread=False)
        self.graph = build_case_graph(Deps(self.panel, self.case_cfg), SqliteSaver(conn))
        start_case(self.graph, CASE, self.assessment, "en", "standard")  # stops at the counsellor gate

    def now(self) -> datetime:
        return T0 + timedelta(days=self.offset_days)

    def values(self) -> dict:
        return self.graph.get_state(cfg_of(CASE)).values

    def lang_level(self, session: Session, subject: str) -> tuple[str, str]:
        p = session.get(Person, subject)
        return (p.language, p.reading_level) if p else ("en", "standard")

    def blocks_for(self, subject: str, session: Session) -> list[str]:
        lang, level = self.lang_level(session, subject)
        v = self.values()
        if v.get("released") and v.get("draft"):
            from services.agents.render import DraftExplanation, render_draft
            lang, level = v["template_set"].split("/")
            return [b.text for b in render_draft(DraftExplanation(**v["draft"]), self.assessment, self.panel,
                                                 self.templates)]
        tset = self.templates[(lang, level)]
        return [tset[i].text for i in ("fictional_notice", "carrier_not_disease", "counsellor_available")]

    # ----- Backend protocol ------------------------------------------------------------------------
    async def invoke(self, operation: str, subject: str, payload: dict | None, session: Session):
        fn = getattr(self, f"op_{operation.replace('-', '_')}", None)
        if fn is None:
            raise Unavailable(f"Operation {operation} is not connected")
        return fn(subject, payload, session)

    async def delete_person(self, subject: str, session: Session) -> None:
        self.results.pop(subject, None)

    def op_results(self, subject, payload, session):
        rows = list(self.results.get(subject, {}).items())
        shown = [r for r in rows if r[1] != "not_detected"] + [r for r in rows if r[1] == "not_detected"][:2]
        return [{"condition_id": c, "status": s, "panel_version": self.panel.panel_version} for c, s in shown]

    def op_explanation(self, subject, payload, session):
        return {"blocks": self.blocks_for(subject, session), "released": True}

    def op_assessment(self, subject, payload, session):
        a: CoupleAssessment = self.assessment
        return {"tier": a.tier, "engine_version": a.engine_version, "shared_conditions": [f.condition_id for f in a.findings],
                "findings": [{"condition_id": f.condition_id, "risk_affected": f.risk_affected,
                              "note_codes": f.note_codes} for f in a.findings]}

    def op_pedigree(self, subject, payload, session):
        return {"relationships": self.edges, "warnings": []}

    def op_edit_pedigree(self, subject, payload, session):
        self.edges = payload["relationships"]
        warn = ["uncertain_edges_present"] if any(e["confidence"] == "uncertain" for e in self.edges) else []
        return {"relationships": self.edges, "warnings": warn}

    def op_quiz(self, subject, payload, session):
        lang = self.values()["template_set"].split("/")[0]
        q = build_quiz(self.assessment, lang)
        return {"questions": [q_.model_dump() for q_ in q.questions]}

    def op_quiz_answers(self, subject, payload, session):
        if "teach_back" not in pending(self.graph, CASE):
            return {"status": "not_waiting"}
        lang = self.values()["template_set"].split("/")[0]
        quiz = build_quiz(self.assessment, lang)
        picks = payload["answers"]
        answers = {q.id: "abc"[i] for q, i in zip(quiz.questions, picks) if i < len(q.options)}
        resume_case(self.graph, CASE, answers)
        v = self.values()
        if "teach_back" in pending(self.graph, CASE):
            return {"status": "reexplain"}
        return {"status": "counsellor_offered" if v.get("counsellor_offered") else "passed"}

    def op_case_status(self, subject, payload, session):
        v = self.values()
        return {"id": CASE, "status": v.get("status", "drafting"), "tier": self.assessment.tier,
                "due_at": (self.now() + timedelta(days=3)).timestamp()}

    def op_brief(self, subject, payload, session):
        a = self.assessment
        return {"brief": [f"tier_{a.tier}", *[f"finding_{f.condition_id}" for f in a.findings],
                          *(["related_partners"] if a.kinship_phi > 0 else [])]}

    def op_decision(self, subject, payload, session):
        if "counsellor_gate" not in pending(self.graph, CASE):
            return {"status": "no_pending_decision"}
        resume_case(self.graph, CASE, {"action": payload["decision"], "reason_code": payload["reason_code"]})
        if payload["decision"] in ("approve", "edit"):
            for c in session.scalars(select(Couple).where(Couple.id == COUPLE)):
                c.released = True
            return {"status": "released"}
        return {"status": "held"}

    def op_referral(self, subject, payload, session):
        rs = ReferralState(**self.values().get("referral", ReferralState().model_dump(mode="json")))
        rs = mark_overdue(rs, self.now())
        steps = [{"state": e.to_state, "owner_id": e.owner, "due_at": (e.due or e.at).timestamp()} for e in rs.events]
        if not steps:
            steps = [{"state": rs.state, "owner_id": rs.owner, "due_at": (self.now() + timedelta(days=7)).timestamp()}]
        if rs.overdue:
            steps.append({"state": "overdue", "owner_id": "timer", "due_at": rs.due.timestamp() if rs.due else 0.0})
        return {"referral": steps}

    def op_referral_event(self, subject, payload, session):
        if "referral" not in self.values():
            raise ValueError("Referral tracking has not started")
        evidence = None if payload["evidence_code"] == "none" else payload["evidence_code"]
        try:
            record_referral(self.graph, CASE, payload["event"], self.now(), self.rules_cfg, evidence)
        except ReferralError as e:
            raise ValueError(str(e)) from None
        return {"status": payload["event"]}

    def op_advance_time(self, subject, payload, session):
        self.offset_days += int(payload["days"])
        rs = ReferralState(**self.values().get("referral", ReferralState().model_dump(mode="json")))
        self.graph.update_state(cfg_of(CASE), {"referral": mark_overdue(rs, self.now()).model_dump(mode="json")})
        return {"status": f"advanced_{self.offset_days}_days"}

    def op_reset(self, subject, payload, session):
        self.reset_state()
        for c in session.scalars(select(Couple).where(Couple.id == COUPLE)):
            c.released = False
        return {"status": "reset"}

    def op_load_cohort(self, subject, payload, session):
        if not (DEMO_DIR / "manifest.json").exists():
            raise Unavailable("Demo cohort missing; run make cohort")
        return {"status": "cohort_loaded"}

    def _rows(self, name: str) -> list[dict]:
        with gzip.open(DEMO_DIR / f"{name}.jsonl.gz", "rt", encoding="utf-8") as fh:
            return [json.loads(x) for x in fh.read().splitlines()]

    def op_aggregate_counts(self, subject, payload, session):
        couples = self._rows("couples")
        if subject == "dashboard":
            c = Counter(f"tier_{x['tier']}" for x in couples)
            return {k: c.get(k, 0) for k in ("tier_1", "tier_2", "tier_3")}
        persons = {p["id"]: p for p in self._rows("persons")}
        if subject == "comprehension":  # scripted pipeline input, not evidence about people
            c = Counter(f"{persons[x['person_a']]['language']}_{persons[x['person_a']]['reading_level']}" for x in couples)
            return {k: c[k] for k in sorted(c)}
        if subject == "capacity":
            c = Counter(f"arrivals_{persons[x['person_a']]['language']}" for x in couples)
            return {k: c[k] for k in sorted(c)}
        raise Unavailable("Unknown aggregate")

    def op_capacity_simulation(self, subject, payload, session):
        return compare(self.capacity_cfg)

    def op_eval_run(self, subject, payload, session):
        from services.agents.eval import run_eval
        r = run_eval()
        return {"metrics": {"numeric_fidelity": r["numeric_fidelity"], "block_conformity": r["block_conformity"],
                            "banned_phrases": float(r["banned_phrases"]), "drafts": float(r["drafts"])}}

    def op_evaluation(self, subject, payload, session):
        return self.op_eval_run(subject, payload, session)

    def op_copilot_context(self, subject, payload, session):
        return {"blocks": self.blocks_for(subject, session), "language": self.lang_level(session, subject)[0]}

    def copilot(self, text: str, subject: str, session: Session, consents: list[str]) -> dict:
        lang = self.lang_level(session, subject)[0]
        a = copilot_answer(text, lang, self.blocks_for(subject, session), self.glossary, consents)
        return {"text": a.text, "refused": a.refused, "code": a.code, "sources": a.sources}

    def seed(self, session: Session) -> None:
        """Create the consent-side rows for the demo couple (idempotent)."""
        for pid, lang in ((A, "en"), (B, "en")):
            if session.get(Person, pid) is None:
                session.add(Person(id=pid, language=lang, reading_level="standard"))
        if session.get(Couple, COUPLE) is None:
            session.add(Couple(id=COUPLE, person_a=A, person_b=B, released=False))
        if session.get(CaseAccess, CASE) is None:
            session.add(CaseAccess(id=CASE, owner_id=A, couple_id=COUPLE, assigned_to="synthetic-counsellor",
                                   assignment_expires_at=4_000_000_000.0, assignment_reason="demo_review"))
        session.commit()
