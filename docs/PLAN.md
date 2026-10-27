# KinSight build plan (autonomous run, started 2026-10-25)

Source of truth: `docs/SPEC.txt` (text of the Build Specification PDF). Phase/task ids (P0-1 ...) match spec section 10.
Every commit message starts with its task id. Push to `main` after every finished task (`git pull --rebase` first).

## Work split (disjoint directories, so no merge conflicts)
| Owner | Scope | Paths |
|---|---|---|
| Claude | P0 scaffold, P1 genetics engine + configs + cohort generator + migrations, then P3 explainer/verifier/graphs, integration | `services/genetics`, `services/cohort`, `services/agents`, `configs`, `templates`, `prompts`, root files |
| Codex | P2 consent vault, `decide()`, audit chain, aggregates, privacy tests; then FastAPI app + routes (P2-2, P3-8) | `services/consent`, `services/api`, `tests/integration` (privacy/api) |
| opencode | P4-1..P4-3 Next.js web app (i18n ar/en, RTL, user screens, SVG pedigree viewer) against a mock/typed API; later counsellor/analyst/governance screens | `web/` |
| Claude | P4 analytics (comprehension, capacity), P6 docs | `services/analytics`, `docs/` |

## Interfaces agreed up front
- Python package roots are top-level dirs under `services/` (import as `services.genetics...`). `pyproject.toml` at repo root, pytest from root.
- Python 3.10+ in this environment (spec says 3.12; see `docs/DEVIATIONS.md`).
- Engine: `services.genetics` exports `Pedigree, kinship, inbreeding, assess_couple, Finding, CoupleAssessment` (spec section 5).
- Consent: `services.consent.policy.decide(actor, resource, purpose, fields) -> Decision` (spec section 8).
- API: FastAPI app at `services.api.main:app`; routes per spec section 9; the web app talks only to it.

## Order
1. P0-2/3/4/5 scaffold, CI, DATA_SOURCES.md  -> Claude (now)
2. P1-1..P1-7 engine, configs, cohort       -> Claude;  P2 consent + API skeleton -> Codex;  web shell -> opencode (parallel)
3. P3 templates, renderer, verifier, graphs, quiz, referral state machine -> Claude
4. P4 screens/dashboards/simulator, demo-path test
5. P5 only after P4 exits (flags); P6 docs, fresh-clone test
Scope rule: if P4 slips, drop P5.

## Guided demo (finished 2026-10-27)
42 narrated steps (`web/lib/demoScript.ts`, `web/lib/demo.tsx`, `web/components/DemoOverlay.tsx`); how to run it: README and docs/RESEARCH.md section 5.
Tested by `web/e2e/demo.spec.ts` (full en and ar runs, controls, narration; desktop and phone). Full Playwright suite: 52 passing.
Phone check found and fixed: the caption covered the spotlight (targets now scroll to the top, the caption moves to the top when there is
more room there, and the speed control is hidden on narrow screens so the controls fit one row), and skipping a step during its start-up
delay let the stale step reopen the search palette.
Remaining from the spec: the volunteer comprehension study (docs/study/protocol.md) has not been run.
