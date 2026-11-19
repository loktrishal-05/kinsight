# Work split for the final submission (19-20 Nov 2026)

Two coding agents work in parallel. Each owns the files listed for its issues; neither edits the other's area without saying so in the issue thread.

## Rules for both agents
- Read `AGENTS.md`, the issue body and its **Non-negotiables** before writing code.
- Comment `/claim` on the issue, branch `issue-<n>-<short-name>`, open a PR with `Closes #<n>`, merge only when CI is green (`gh pr checks`).
- Every risk number is an `Estimate` in the API and sits inside `<Estimate>` in the web app (`tests/integration/test_estimate_label.py`, `web/e2e/estimate-label.spec.ts`).
- Every new route calls the consent policy (`check`/`own`) or is listed in `tests/integration/test_route_consent_inventory.py` with a reason, and writes one audit event.
- New lifecycle-style routes go under `/api/lifecycle/` (see `test_api_privacy.py`).
- CI runs on Linux: never compare floats exactly across platforms (round fixtures, use `approx`).
- Neutral wording only (`test_nonstigma.py`, `test_banned_phrases.py`). English and Arabic strings at minimum; other languages fall back to English and get a row in `docs/REVIEWS.md`.
- Before merging: `python -m ruff check .`, `python -m pytest -q tests`, `cd web && npx tsc --noEmit && npx vitest run && npx playwright test --workers=1`.

## Codex
Backend, integrations and the assistant. Owns `services/` (except `services/api/main.py` middleware and `services/consent/policy.py` edits, which Codex coordinates in the PR description), `templates/`, `scripts/`, `migrations/`, `web/lib/assistant.ts` and the pages listed below.

| Order | Issue | Notes |
| --- | --- | --- |
| 1 | #28 FHIR R4 / SMART import | Much is built (`services/api/fhir_preview.py`). Audit against the issue's acceptance criteria, close the gaps, close the issue. |
| 2 | #30 Lab interface (HL7 v2 / FHIR feed) | Built in `hl7_lab.py`, `lab_feed.py`. Same: verify, fill gaps, close. |
| 3 | #29 FHIR referral write-back | ServiceRequest / Task to the sandbox, behind consent. |
| 4 | #31 Lab-report parsing | Builds on `web/app/report-compare`; upload validation by magic bytes, size and page count, no persistence. |
| 5 | #35 Kin v2 | Grounded tool use over the deterministic engine; include `run_scenario` (`services/genetics/scenarios.py`, route `/api/lifecycle/scenario`) and the prep sheet. Optional LLM off by default. |
| 6 | #33 Live reference data | MedlinePlus, ClinGen, Orphanet, Ensembl VEP; only variant ids / gene symbols leave the server. |
| 7 | #34 MCP servers and skills | Dev tooling and counsellor copilot. |
| 8 | #54 Linkage v2, #55 Notifications | Only if 1-7 are merged. |

## Claude
Web app, consent-facing workflow, quality gates and the submission evidence. Owns `web/app/**` pages not listed above, `web/components/**`, `web/messages/**` layout keys, `.github/`, `docs/`.

| Order | Issue |
| --- | --- |
| 1 | #60 Security headers and threat model (this PR) |
| 2 | #40 Unified counsellor approval queue |
| 3 | #38 Cascade screening tracker UI |
| 4 | #46 Outcome metrics (includes prep-sheet usage from #36) |
| 5 | #58 CI hardening, #59 linting |
| 6 | #53 Accessibility, #47 app shell, #48 person dashboard, #49 counsellor workspace |
| 7 | #64 Traceability doc (judge feedback to evidence) |

## People, not agents
- #44 Comprehension study and #45 expert and native-speaker review: these need real participants and reviewers.
- #64 deck, video and form text; #63 hosting checks on the live site.

## Deferred to the finale (after shortlisting)
#39 pedigree builder, #50 analyst charts, #51 design system, #52 mobile/PWA, #61 Next.js upgrade, Dependabot #78 (Tailwind 4 migration).
