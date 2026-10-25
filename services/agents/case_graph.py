"""Graph 2: one thread per couple case (spec section 6). Routing is deterministic; no model decides tiers.

State holds plain dicts (model_dump) so any checkpointer can serialise it.
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from services.genetics import CoupleAssessment, Panel

from .quiz import Quiz, build_quiz, grade
from .referral import ReferralState
from .render import DraftExplanation, load_templates, select_blocks
from .verify import VerifyReport, load_wording, verify


class CaseState(TypedDict, total=False):
    case_id: str
    couple_id: str
    assessment: dict          # from the engine; no agent may edit it
    language: str
    reading_level: str
    template_set: str | None
    template_fallback: bool
    draft: dict | None
    verify_report: dict | None
    retries: int
    quiz: dict | None
    quiz_result: dict | None
    reexplain_count: int
    counsellor_offered: bool
    counsellor_decision: dict | None
    released: bool
    referral: dict
    status: str


@dataclass
class Deps:
    panel: Panel
    case_cfg: dict
    templates: dict = field(default_factory=load_templates)
    wording: dict = field(default_factory=load_wording)
    # Mode A chooser: (assessment, lang, level, previous_errors) -> DraftExplanation. A model may be plugged in
    # here; it can only choose allow-listed block ids, and the verifier gates the result either way.
    chooser: Callable[..., DraftExplanation] = lambda a, lang, lvl, errs, tpl: select_blocks(a, lang, lvl, tpl)


def build_case_graph(deps: Deps, checkpointer: Any):
    cfg = deps.case_cfg

    def asm(s: CaseState) -> CoupleAssessment:
        return CoupleAssessment(**s["assessment"])

    def select_template(s: CaseState) -> dict:
        lang, level = s["language"], s["reading_level"]
        if s.get("reexplain_count", 0) > 0:
            level = "basic"  # simpler re-explanation
        fallback = (lang, level) not in deps.templates
        if fallback:
            lang, level = "en", "basic"  # plain English set, flagged
        return {"template_set": f"{lang}/{level}", "template_fallback": fallback, "status": "drafting"}

    def explain_agent(s: CaseState) -> dict:
        lang, level = s["template_set"].split("/")
        errs = (s.get("verify_report") or {}).get("errors", [])
        d = deps.chooser(asm(s), lang, level, errs, deps.templates)
        return {"draft": d.model_dump()}

    def verify_node(s: CaseState) -> dict:
        rep = verify(DraftExplanation(**s["draft"]), asm(s), deps.panel, deps.templates, deps.wording)
        return {"verify_report": rep.model_dump(), "retries": s.get("retries", 0) + (0 if rep.ok else 1)}

    def route_after_verify(s: CaseState) -> str:
        if s["verify_report"]["ok"]:
            return "ok" if (s.get("reexplain_count", 0) > 0 or s["assessment"]["tier"] != 3) else "tier3"
        return "retry" if s["retries"] <= cfg["explain_max_retries"] else "fail"

    def counsellor_gate(s: CaseState) -> Command:
        # No side effects above interrupt(): a resumed node restarts from its first line.
        decision = interrupt({"case_id": s["case_id"], "draft": s["draft"], "assessment": s["assessment"],
                              "verify_report": s["verify_report"]})
        if decision.get("action") == "hold":
            return Command(update={"counsellor_decision": decision, "status": "awaiting_counsellor"},
                           goto="counsellor_gate")
        return Command(update={"counsellor_decision": decision}, goto="release")

    def release(s: CaseState) -> dict:
        # Visibility to a partner is decided by the consent policy at read time (fail closed there).
        return {"released": True, "status": "released"}

    def teach_back(s: CaseState) -> dict:
        quiz = build_quiz(asm(s), s["template_set"].split("/")[0])
        answers = interrupt({"case_id": s["case_id"],
                             "quiz": quiz.model_dump(exclude={"key"})})
        if answers.get("event") == "timeout":  # reminder sent by the scheduler; now offer a counsellor
            return {"quiz": quiz.model_dump(), "quiz_result": None, "counsellor_offered": True}
        return {"quiz": quiz.model_dump(), "quiz_result": grade(quiz, answers, cfg["quiz"]["pass_min"]).model_dump()}

    def check_understanding(s: CaseState) -> dict:
        r = s.get("quiz_result")
        if r is None or r["passed"]:
            return {}
        if s.get("reexplain_count", 0) < cfg["reexplain_max"]:
            return {"reexplain_count": s.get("reexplain_count", 0) + 1, "status": "awaiting_user"}
        return {"counsellor_offered": True}  # never loop a third time

    def route_after_quiz(s: CaseState) -> str:
        r = s.get("quiz_result")
        if r is None or r["passed"] or s.get("counsellor_offered"):
            return "continue"
        return "reexplain"

    def referral_tracker(s: CaseState) -> dict:
        # Later steps (counselling, confirmatory, specialist, closed) arrive as API events via record_referral.
        return {"referral": ReferralState().model_dump(mode="json"), "status": "tracking"}

    g = StateGraph(CaseState)
    for name, fn in [("select_template", select_template), ("explain_agent", explain_agent), ("verify", verify_node),
                     ("counsellor_gate", counsellor_gate), ("release", release), ("teach_back", teach_back),
                     ("check_understanding", check_understanding), ("referral_tracker", referral_tracker)]:
        g.add_node(name, fn)
    g.add_edge(START, "select_template")
    g.add_edge("select_template", "explain_agent")
    g.add_edge("explain_agent", "verify")
    g.add_conditional_edges("verify", route_after_verify, {"retry": "explain_agent", "tier3": "counsellor_gate",
                                                           "ok": "release", "fail": "counsellor_gate"})
    g.add_edge("release", "teach_back")
    g.add_edge("teach_back", "check_understanding")
    g.add_conditional_edges("check_understanding", route_after_quiz,
                            {"reexplain": "select_template", "continue": "referral_tracker"})
    g.add_edge("referral_tracker", END)
    return g.compile(checkpointer=checkpointer)


def cfg_of(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


def start_case(graph, case_id: str, assessment: CoupleAssessment, language: str, level: str) -> dict:
    return graph.invoke({"case_id": case_id, "couple_id": assessment.couple_id, "assessment": assessment.model_dump(),
                         "language": language, "reading_level": level, "retries": 0, "reexplain_count": 0,
                         "released": False, "status": "drafting"}, cfg_of(case_id))


def resume_case(graph, case_id: str, value: dict) -> dict:
    return graph.invoke(Command(resume=value), cfg_of(case_id))


def pending(graph, case_id: str) -> tuple[str, ...]:
    return tuple(graph.get_state(cfg_of(case_id)).next)


def record_referral(graph, case_id: str, to: str, now, rules: dict, evidence: str | None = None) -> dict:
    """Apply an allowed referral transition to the thread's state (called by the API; timers use mark_overdue)."""
    from .referral import advance
    cur = ReferralState(**graph.get_state(cfg_of(case_id)).values["referral"])
    new = advance(cur, to, now, rules, evidence)
    graph.update_state(cfg_of(case_id), {"referral": new.model_dump(mode="json"),
                                         "status": "closed" if to == "closed" else "tracking"})
    return new.model_dump(mode="json")


__all__ = [
    "Deps",
    "Quiz",
    "VerifyReport",
    "build_case_graph",
    "pending",
    "record_referral",
    "resume_case",
    "start_case",
]
