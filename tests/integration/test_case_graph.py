import json
import pathlib
import sqlite3
from datetime import datetime, timedelta, timezone

import pytest
import yaml
from langgraph.checkpoint.sqlite import SqliteSaver

from services.agents.case_graph import (
    Deps,
    build_case_graph,
    pending,
    record_referral,
    resume_case,
    start_case,
)
from services.agents.quiz import build_quiz
from services.agents.referral import ReferralError, ReferralState, advance, mark_overdue
from services.cohort.panel import CONFIGS, load_panel
from services.genetics import CoupleAssessment

PANEL = load_panel()
CASE_CFG = yaml.safe_load((CONFIGS / "case.yaml").read_text())
RULES = yaml.safe_load((CONFIGS / "escalation.yaml").read_text())
GOLD = [
    CoupleAssessment(**c["expected"])
    for c in json.loads(
        (pathlib.Path(__file__).parents[1] / "golden/couples.json").read_text(encoding="utf-8")
    )
]
T3 = next(a for a in GOLD if a.tier == 3)
T1 = next(a for a in GOLD if a.tier == 1)
T0 = datetime(2026, 11, 1, tzinfo=timezone.utc)


def make_graph(db):
    conn = sqlite3.connect(db, check_same_thread=False)
    return build_case_graph(Deps(PANEL, CASE_CFG), SqliteSaver(conn))


def answers_for(graph, cid, wrong=0):
    key = build_quiz(
        CoupleAssessment(
            **graph.get_state({"configurable": {"thread_id": cid}}).values["assessment"]
        ),
        graph.get_state({"configurable": {"thread_id": cid}}).values["language"],
    ).key
    out = dict(key)
    for q in list(out)[:wrong]:
        out[q] = "z"
    return out


def test_tier3_stops_at_gate_survives_restart_then_teach_back(tmp_path):
    db = tmp_path / "cp.sqlite"
    g1 = make_graph(db)
    start_case(g1, "c1", T3, "en", "standard")
    assert pending(g1, "c1") == ("counsellor_gate",)
    g2 = make_graph(db)  # simulated API restart: new graph, new connection, same checkpoints
    assert pending(g2, "c1") == ("counsellor_gate",)
    resume_case(g2, "c1", {"action": "approve", "counsellor": "demo"})
    assert (
        pending(g2, "c1") == ("teach_back",)
        and g2.get_state({"configurable": {"thread_id": "c1"}}).values["released"]
    )
    g3 = make_graph(db)  # restart again between the two interrupts
    resume_case(g3, "c1", answers_for(g3, "c1"))
    st = g3.get_state({"configurable": {"thread_id": "c1"}})
    assert (
        st.next == ()
        and st.values["status"] == "tracking"
        and st.values["referral"]["state"] == "result_released"
    )


def test_tier1_passes_straight_through_to_teach_back(tmp_path):
    g = make_graph(tmp_path / "cp.sqlite")
    start_case(g, "c2", T1, "ar", "basic")
    assert pending(g, "c2") == ("teach_back",)


def test_hold_keeps_case_at_gate(tmp_path):
    g = make_graph(tmp_path / "cp.sqlite")
    start_case(g, "c3", T3, "en", "standard")
    resume_case(g, "c3", {"action": "hold"})
    assert pending(g, "c3") == ("counsellor_gate",)


def test_fail_one_question_reexplains_simpler_then_passes(tmp_path):
    g = make_graph(tmp_path / "cp.sqlite")
    start_case(g, "c4", T1, "en", "standard")
    resume_case(g, "c4", answers_for(g, "c4", wrong=1))
    v = g.get_state({"configurable": {"thread_id": "c4"}}).values
    assert (
        pending(g, "c4") == ("teach_back",)
        and v["reexplain_count"] == 1
        and v["template_set"] == "en/basic"
    )
    resume_case(g, "c4", answers_for(g, "c4"))
    assert pending(g, "c4") == ()


def test_second_failure_offers_counsellor_and_does_not_loop(tmp_path):
    g = make_graph(tmp_path / "cp.sqlite")
    start_case(g, "c5", T1, "en", "standard")
    resume_case(g, "c5", answers_for(g, "c5", wrong=2))
    resume_case(g, "c5", answers_for(g, "c5", wrong=2))
    st = g.get_state({"configurable": {"thread_id": "c5"}})
    assert st.next == () and st.values["counsellor_offered"] and st.values["reexplain_count"] == 1


def test_quiz_answer_key_matches_engine():
    a = next(x for x in GOLD if any(f.formula_id == "ar_both_carrier" for f in x.findings))
    q = build_quiz(a, "en")
    chance = next(x for x in q.questions if x.id == "q_chance_value")
    right = next(o for o in chance.options if o.id == q.key["q_chance_value"])
    assert right.text == "25%" and len(q.questions) == 5


def test_referral_transitions_overdue_and_closure(tmp_path):
    g = make_graph(tmp_path / "cp.sqlite")
    start_case(g, "c6", T1, "en", "standard")
    resume_case(g, "c6", answers_for(g, "c6"))
    r = record_referral(g, "c6", "counselling_requested", T0, RULES)
    assert r["state"] == "counselling_requested" and r["owner"] == "counsellor"
    with pytest.raises(ReferralError):
        record_referral(g, "c6", "confirmatory_done", T0, RULES)  # skipping steps is illegal
    rs = ReferralState(**r)
    late = mark_overdue(rs, T0 + timedelta(days=30))
    assert late.overdue
    cleared = advance(late, "counselling_done", T0 + timedelta(days=31), RULES)
    assert not cleared.overdue
    with pytest.raises(ReferralError):
        advance(cleared, "closed", T0, RULES)  # no evidence
    assert (
        advance(cleared, "closed", T0, RULES, evidence="counsellor decision #1").state == "closed"
    )
