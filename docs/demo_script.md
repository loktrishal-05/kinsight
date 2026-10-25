# Demo script (acceptance test; target under 5 minutes)

Automated: `python scripts/demo.py` (steps 2 to 9 via the API), `cd web && npx playwright test` (UI, English and Arabic,
desktop and phone). Recording a video of the steps below is still to be done by a person.

1. Choose the related-couple persona (Person A); note the "all people and results are fictional" banner; switch to Arabic and show the right-to-left layout.
2. Person A opens their own result and explanation; Person B does the same.
3. Both choose "Share for couple planning". The couple view shows "a counsellor will review this with you" (tier 3).
4. Counsellor persona: open the queue and the brief, approve.
5. The couple sees the released explanation, takes the quiz, misses one question, gets a simpler re-explanation, passes.
6. Next steps: referral timeline (counselling requested, then confirmatory); advance time to show the overdue marker.
7. Family circle: invite a relative; declining reveals nothing; accepting a limited scope shows only that item; revoke ends access at once.
8. Analyst: suppressed small cells, comprehension by language and level, capacity simulator (illustrative).
9. Governance: verify the audit chain, run the tamper test (fails), ask the copilot about the result, then ask for the partner's raw result and see the refusal.
