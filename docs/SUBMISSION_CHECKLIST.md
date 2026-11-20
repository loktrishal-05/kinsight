# Final submission checklist (issues #64 and #65)

**Deadline: 20 Nov 2026, 23:59 IST** on the Hack2Skill dashboard (Submissions). The team lead submits. Evaluation runs 21-30 Nov.

The code is finished: every feature issue from the early review is merged and tested (see [JUDGE_FEEDBACK.md](JUDGE_FEEDBACK.md)). What is left needs a person: the deck, the video, a check of the live site, and pressing submit.

| Step | Who | Time | Done |
| --- | --- | --- | --- |
| 1. Check the live site | anyone | 15 min | [ ] |
| 2. Update the deck, export PDF | anyone | 60 min | [ ] |
| 3. Record the demo video | anyone | 45 min | [ ] |
| 4. Paste the form text | team lead | 10 min | [ ] |
| 5. Submit | team lead | 5 min | [ ] |
| 6. Close #64 and #65, then freeze `main` | team lead | 2 min | [ ] |

## 1. Check the live site (do this first; the video depends on it)

Open https://kinsight-five.vercel.app in a private window.

- [ ] Landing page footer says **Live service: online**. If it says *waking up*, wait a minute or run **Actions -> keepalive -> Run workflow** on GitHub.
- [ ] **Start the demo** works; **Viewing as** switches between Person A, Person B, Counsellor, Analyst and Auditor.
- [ ] Every risk figure shows **"educational estimate, not a diagnosis"** (for example `/couple`, `/plan/scenarios`).
- [ ] `/couple` shows the counsellor waiting notice until the counsellor approves in `/counsellor`.
- [ ] `/report-compare` reads the sample PDF and a photo; each field is confirmed before use.
- [ ] `/prepare`, `/plan/scenarios`, `/cascade`, `/family` (edit the tree) and `/privacy` open without errors.
- [ ] Switch to Arabic: layout flips right to left.
- [ ] On a phone: no sideways scroll; the bottom tab bar shows.

Anything broken: note it, and say so honestly in the form rather than claiming it.

## 2. Deck (`KinSight_Submission_Deck.pptx`, PDF at most 5 MB)

The deck is not in the repository; use the team's copy. Keep the existing title, problem and team slides. Add or replace with these, one idea per slide, a screenshot on each (screenshots are in `docs/screenshots/`, or take new ones in step 1):

1. **What the judges asked, what we built.** The review quote, then four ticks: integrations, pre-counselling suite, guardrails, evidence plan. Point to `docs/JUDGE_FEEDBACK.md`.
2. **Lab and health-record integration.** Signed HL7 v2 and FHIR lab feed, FHIR R4 import and referral write-back (synthetic HAPI sandbox), report reading from PDF or photo with field-by-field confirmation.
3. **Kin, the preparation assistant.** Answers from the person's own result through fixed tools; refuses partner data; optional model mode can only choose tools, never invent numbers.
4. **Pre-counselling suite.** Preparation sheet with tailored neutral questions, shared per section only by choice.
5. **What-if scenarios.** Per pregnancy and "at least one of N"; the five routes described neutrally.
6. **Family.** Editable family tree; cascade tracker where relatives get a condition-only invite, never the sender's result.
7. **Guardrails.** Default-deny consent on every route with a tamper-evident audit; every figure labelled an educational estimate; counsellors approve every complex or high-risk result first.
8. **Quality.** About 840 Python tests, 120 web unit tests, Playwright on desktop and phone, WCAG 2.2 AA with zero axe violations, CodeQL and secret scanning in CI.
9. **Honest limits and next steps.** Synthetic data only. Comprehension study and expert review not yet run (protocol, tooling and review pack ready). Hosted FHIR and lab feed are documented but not switched on. SMART launch and a real lab partner need agreements.

Remove any slide that claims something not in this list. Export as PDF and check the size (File -> Export -> PDF, "Minimum size" if over 5 MB).

## 3. Demo video (check the event's length limit; aim for 4-5 minutes)

Record the live site from step 1 with sound, in one take per scene. Say "all people and results are fictional" at the start.

| # | Scene | What to show | Seconds |
| --- | --- | --- | --- |
| 1 | Start | Landing, status line online, **Start the demo** as Person A; switch to Arabic and back | 25 |
| 2 | Upload a report | `/report-compare`: add the sample report, confirm the fields | 40 |
| 3 | Share and wait | Person A and B share for couple planning; `/couple` shows the counsellor waiting notice | 30 |
| 4 | Counsellor approves | Switch to Counsellor; open the review queue; approve | 30 |
| 5 | The result | `/couple`: the figure with its educational-estimate label and method link | 20 |
| 6 | What-if | `/plan/scenarios`: change the number of pregnancies; the routes in neutral words | 35 |
| 7 | Prepare | `/prepare`: pick concerns, add a question, print the sheet; ask Kin one question | 40 |
| 8 | Family | `/family` edit the tree; `/cascade` invite a relative | 35 |
| 9 | Privacy | `/privacy` and `/governance`: verify the audit chain; ask Kin for the partner's result and show the refusal | 35 |

Upload where the form asks (unlisted YouTube or Drive, link open to anyone with it). Check the link in a private window.

## 4. Form text

Paste from [SUBMISSION_TEXT.md](SUBMISSION_TEXT.md): the **Solution summary** (1,862 of 2,000 characters) and **What has been built** (1,178 of 1,500). If step 1 found something broken, edit the text to match. Add the live link, the repository link, the deck PDF and the video link.

## 5. Submit

Read the whole form once more, then submit. Take a screenshot of the confirmation.

## 6. After submitting

- Close **#64** and **#65** on GitHub with a comment linking the confirmation (or ask Claude to).
- **Do not push to `main` until results are out.** Late commits can be held against us. Work on branches only.
- After judging: retire the unused Oregon API service (`docs/HOSTING.md`), and decide on switching on the hosted FHIR and lab feed (`docs/REAL_DATA_ROLLOUT.md`).
