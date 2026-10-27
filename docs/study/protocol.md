# Mini-study protocol (tooling ready, not yet run)

**Status.** The study tooling is built and tested (below). What is still missing is people and approval: the college's ethics rules must be checked first (OPEN_QUESTIONS 4), and volunteers recruited. Until it runs, KinSight reports comprehension as *not measured* and claims nothing about it. If it cannot run, this protocol is the deliverable and the write-up says so.

## Running it
1. Facilitator opens `/study` on a laptop or tablet (the build must be served; mock mode is fine: no server, no network storage).
2. The participant picks their language (seven are available), ticks the consent box (18+, anonymous, can stop) and reads one fictional case. `?case=s1..s7` picks the case (default `s3`, a related couple, tier 3); `?level=basic|standard` fixes the reading level, otherwise it alternates so both levels fill evenly in each language.
3. The participant answers the five-question check once, with no re-explanation, then optionally rates clarity 1-5. They receive a random study number (`S-XXXXXXXX`); no name, contact or health detail is asked.
4. Responses stay in that browser's local storage. `/study/results` shows pass rate by language x level, the largest gap against the 10-point target and the questions missed most; export CSV or JSON from there. Use one device per session or export before switching, and do not clear browser data until exported.
5. `python scripts/analyse_study.py kinsight-study-<date>.csv --out docs/study/results.md` writes the descriptive report (n, pass rate, gap, clarity, most-missed questions) using `services/analytics/comprehension.py`. Tests: `tests/unit/test_study_analysis.py`, `web/tests/study.test.ts`, `web/e2e/study.spec.ts`.

**Before real use.** Translations other than English are machine drafts (docs/REVIEWS.md). A native speaker should review the consent text and the explanations of every language that will be tested, or those groups' results will partly measure translation quality.

**Question.** Do volunteers understand the key points of a fictional couple's result in Arabic and English, at basic and standard reading levels?

**Design.** Volunteers (aged 18+) read one fictional case explanation (rendered by KinSight from the approved templates), answer the five-question teach-back quiz, and optionally rate clarity. Fictional cases only; no health data, names or contact details collected; study ids only. Consent text shown first, in the participant's language.

**Outcome.** Quiz pass rate and gap by language x level (`services/analytics/comprehension.py`). Group sizes are reported plainly even when small; no claims beyond them. Language-model simulated readers are not used as evidence.

**Analysis.** Descriptive only: n, pass rate, gap against the 10-point target. Items missed most often feed template edits via the review gate.

**Limits.** Small, convenience sample, fictional content, no clinical outcome.
