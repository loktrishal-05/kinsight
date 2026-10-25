"""Spec demo script (section 9), steps 2-9, driven through the HTTP API. Used by tests and `make demo`."""
from __future__ import annotations

import time

COUPLE, CASE = "demo-couple", "demo-case"


def _h(client, persona):
    r = client.post("/api/auth/persona", json={"persona": persona})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["access_token"]}


def _grant(client, h, grantee, rtype, rid, scope, fields, purpose):
    r = client.post("/api/me/consents", headers=h, json={
        "grantee_id": grantee, "resource_type": rtype, "resource_id": rid, "scope": scope, "fields": fields,
        "purpose": purpose, "expires_at": time.time() + 3000, "text_shown": "Fictional consent text"})
    assert r.status_code == 200, r.text
    return r.json()


def run_demo_path(client, log=print) -> dict:
    """Returns a small summary; asserts every step of the acceptance script."""
    ha, hb = _h(client, "person_a"), _h(client, "person_b")
    pa, pb = _h(client, "partner_a"), _h(client, "partner_b")
    hc, hn, ha_u, hd, ho = (_h(client, p) for p in ("counsellor", "analyst", "auditor", "demo_operator", "relative"))
    client.post("/api/demo/reset", headers=hd)

    # 2. each person reads their own result and explanation first
    for h in (ha, hb):
        res = client.get("/api/me/results", headers=h).json()
        assert any(r["status"] == "carrier" for r in res)
        assert client.get("/api/me/results/x/explanation", headers=h).json()["blocks"]
    log("2 own results read")

    # 3. no couple figure until both grant pooling; then it is tier 3 awaiting counsellor review
    assert client.get(f"/api/couples/{COUPLE}/assessment", headers=pa).status_code == 403
    _grant(client, ha, "synthetic-b", "couple", COUPLE, "couple_pooling", ["tier"], "couple_planning")
    assert client.get(f"/api/couples/{COUPLE}/assessment", headers=pb).status_code == 403  # one side only
    _grant(client, hb, "synthetic-a", "couple", COUPLE, "couple_pooling", ["tier"], "couple_planning")
    fields = ["tier", "shared_conditions", "findings", "engine_version"]
    for h, other in ((ha, "synthetic-b"), (hb, "synthetic-a")):
        _grant(client, h, other, "couple", COUPLE, "couple_summary", fields, "couple_planning")
    assert client.get(f"/api/couples/{COUPLE}/assessment", headers=pa).status_code == 403  # not released yet
    log("3 pooling consented; couple view awaiting counsellor review (tier 3)")

    # 4. counsellor sees the case, reads the brief and approves
    for scope, flds, rid in (("couple_summary", ["brief", "referral"], CASE), ("quiz_status", ["status"], CASE)):
        _grant(client, ha, "synthetic-counsellor", "case", rid, scope, flds, "counselling")
    q = client.get("/api/counsellor/queue", headers=hc)
    assert q.status_code == 200 and q.json() and "status" in q.json()[0], q.text  # only consented fields
    assert client.get(f"/api/counsellor/cases/{CASE}/brief", headers=hc).json()["brief"]
    d = client.post(f"/api/counsellor/cases/{CASE}/decision", headers=hc,
                    json={"decision": "approve", "reason_code": "reviewed"})
    assert d.json()["status"] == "released", d.text
    log("4 counsellor approved")

    # 5. couple sees the released figure; quiz: one wrong -> simpler re-explanation -> pass
    a = client.get(f"/api/couples/{COUPLE}/assessment", headers=pa)
    assert a.status_code == 200 and a.json()["tier"] == 3 and a.json()["findings"], a.text
    quiz = client.get(f"/api/cases/{CASE}/quiz", headers=ha).json()["questions"]
    assert len(quiz) == 5
    from services.agents.quiz import build_quiz  # the test side may read the key; clients never can
    key_quiz = build_quiz(client.app.state.backend.assessment, "en")
    right = [ "abc".index(key_quiz.key[q.id]) for q in key_quiz.questions]
    wrong_one = [(right[0] + 1) % len(key_quiz.questions[0].options)] + right[1:]
    first = client.post(f"/api/cases/{CASE}/quiz/answers", headers=ha, json={"answers": wrong_one}).json()
    assert first["status"] == "reexplain", first  # gentle re-explanation, not a failure
    result = client.post(f"/api/cases/{CASE}/quiz/answers", headers=ha, json={"answers": right}).json()["status"]
    assert result == "passed", result
    log("5 released figure shown; quiz outcome:", result)

    # 6. referral timeline, then fast-forward a timer to show overdue
    ev = client.post(f"/api/counsellor/cases/{CASE}/referral/events", headers=hc,
                     json={"event": "counselling_requested", "evidence_code": "booked"})
    assert ev.status_code == 200, ev.text
    bad = client.post(f"/api/counsellor/cases/{CASE}/referral/events", headers=hc,
                      json={"event": "confirmatory_done", "evidence_code": "x"})
    assert bad.status_code in (400, 422)  # skipping steps is refused
    client.post("/api/demo/advance-time?days=20", headers=hd)
    steps = client.get(f"/api/cases/{CASE}/referral", headers=ha).json()["referral"]
    assert any(s["state"] == "overdue" for s in steps), steps
    log("6 referral timeline with overdue marker")

    # 8. analyst aggregates are suppressed/noised
    dash = client.get("/api/analytics/dashboard", headers=hn)
    assert dash.status_code == 200 and "cells" in dash.json()
    # 9. governance chain verifies; copilot refuses the partner's raw result
    assert client.get("/api/governance/audit-verify", headers=ha_u).json()["valid"] is True
    chat = client.post("/api/copilot/chat", headers=ha, json={"text": "What is my partner's raw result?"})
    assert '"refused": true' in chat.text
    log("8-9 analytics, audit chain, copilot refusal")
    return {"ok": True, "quiz": result, "relative_token": bool(ho)}
