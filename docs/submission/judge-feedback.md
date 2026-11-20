# Early-review feedback: what we built

The early review (18 Nov 2026) asked for the items below. Each row links the request to the issue, the merged pull request, the screen where it can be seen, and the tests that keep it true. Status is **Built** only when it is merged and tested; anything partial says what is missing.

> *"integrate live laboratory interfaces and electronic health records (EHR/FHIR) alongside automated lab-report parsing ... expand "Kin" and family-circle tools into an interactive, personalized pre-counseling preparation suite — what-if family planning scenarios, extended family cascade screening, tailored questions ahead of specialist consultations ... while strictly maintaining default-deny consent and privacy guardrails, labelling risk calculations as educational estimates rather than diagnoses, and ensuring human genetic counselors approve and guide all complex or high-risk findings."*

| Request | Issue | Pull request | Where to see it | Tests | Status |
| --- | --- | --- | --- | --- | --- |
| Live laboratory interfaces | #30 | #85, #108 (hosted runbook) | `/journey` lab tracker, `/lab-sandbox` | `test_lab_feed.py`, `test_hl7_lab.py`, `e2e-live/lab-sandbox.spec.ts` | Built for signed synthetic HL7 v2 and FHIR. Hosted HL7 tested with fictional events. Real lab onboarding needs a partner. |
| Electronic health records (FHIR import) | #28 | #85, #119 (hosted runbook) | `/result` "Health record preview", counsellor review | `test_fhir_preview.py`, `test_fhir_seed.py`, `e2e-live/fhir-preview.spec.ts` | Seeded HAPI R4 import tested with fictional accounts on the hosted demo. SMART launch with PKCE and provider identity binding remain pilot work. |
| EHR referral write-back | #29 | #85 | counsellor console referral status | `test_fhir_referral.py`, `e2e-live/fhir-referral.spec.ts` | Built (ServiceRequest and Task, consented, idempotent). |
| Automated lab-report parsing | #31 | #85, #106 | `/report-compare` | `report-compare.test.ts`, `report-image.test.ts`, `report-compare.spec.ts` | Built for text PDFs, structured text and report photos (read in the browser, never uploaded); every extracted field is reviewed by the person before use. |
| Compare carrier-screening reports | #31 | #106, #130 | `/report-compare`: compare browser-local reports or explore an explicitly hypothetical recessive example for a simple matching pair | `reportWhatIf.test.ts`, `report-whatif.spec.ts` | Matched rows support education. Duplicates, annotations, or X-linked and unclear inheritance point to a counsellor for report interpretation. |
| Expand Kin | #35 | #85, #105 | Kin on every page | `assistant.test.ts`, `test_kin_chooser.py`, `test_copilot_redteam.py`, `assistant.spec.ts` | Built: deterministic tool-using assistant (results, scenarios, preparation, counsellor request), with an opt-in model mode that may only choose tools; refusals and numbers stay with the engine. Off by default. |
| Pre-counselling preparation suite | #36 | #81 | `/prepare` | `test_prep.py`, `prep.test.ts`, `prepare.spec.ts` | Built: values, concerns, suggested and own questions, bring-along list, printable sheet. |
| Tailored questions ahead of consultations | #36 | #81 | `/prepare`, Questions step | `test_prep.py` (deterministic, neutral, ordered) | English and Arabic draft question bank. Clinical and native-language sign-off remains pending in [REVIEWS.md](../research/reviews.md). |
| What-if family-planning scenarios | #37 | #82 | `/plan/scenarios` | `test_scenarios.py` (Hypothesis and 10 golden cases), `scenario.test.ts`, `scenarios.spec.ts` | Built: per pregnancy, at least one of N, untested partner by relationship, neutral description of each route. |
| Extended-family cascade screening | #38 | #86 | `/cascade`, relatives use `/invite` | `test_cascade_engine.py`, `test_cascade_tracker.py`, `cascade.spec.ts` | Built: kinship-based chance per relative, private invite, anonymous notice, outcomes reported back without revealing the sender. |
| Family-circle tools | #39 | #103 | `/family` | `test_pedigree_editor.py`, `pedigreeBuilder.test.ts`, `pedigree-builder.spec.ts` | Built: editable, keyboard-accessible family tree; kinship computed by the engine (first cousins give 1/16). |
| Default-deny consent and privacy guardrails | #42, #60 | #83 and earlier | `/consents`, `/privacy`, `/governance` | `test_route_consent_inventory.py`, `test_privacy.py`, `test_http_hardening.py`, `security-headers.spec.ts` | Built: every route classified and audited, CSP and CORS allow-list, threat model in `docs/architecture/threat-model.md`. |
| Risk shown as an educational estimate, not a diagnosis | #41 | #80 | every figure, for example `/couple` | `test_estimate_label.py`, `estimate-label.spec.ts` (every page, all 7 languages) | Built: the API cannot return a bare risk number; every figure on screen carries the label and a method link. |
| Counsellors approve complex and high-risk findings | #40 | #84 | counsellor console "To review"; person sees a waiting notice | `test_review_queue.py`, `review-queue.spec.ts` | Built: one queue for couple results, imports, lab reports, requests and reclassifications; result-releasing items are approved only in their revision-bound review. |

## Also done for this submission

| Area | Issue | Pull request | Evidence |
| --- | --- | --- | --- |
| Live reference data (MedlinePlus, ClinGen, Ensembl VEP) and nightly ClinVar re-check | #33 | #104 | `/clinic` reference panel, `test_refdata.py`, `reference.spec.ts` |
| Person home as a journey dashboard; app shell with journey-stage menu | #48, #47 | #93, #101 | `dashboard.spec.ts`, `shell.spec.ts` |
| Counsellor workspace (split pane, keyboard triage) | #49 | #94 | `workspace.spec.ts` |
| Analyst charts with table views and aggregate CSV | #50 | #100 | `analyst-charts.spec.ts` |
| Design system: shared loading, error and empty states; one h1 per page | #51 | #109 | `designRules.test.ts`, `structure.spec.ts` |
| Mobile and installable app (PWA), offline page in 7 languages | #52 | #102 | `mobile.spec.ts` |
| Linkage to services: calendar invites, video link, service directory | #54 | #95 | `booking-links.spec.ts` |
| Content-free notifications, opt-in per type | #55 | #99 | `notifications.spec.ts` |
| Hosting: health check with a real database round trip, public status line | #63 | #110 | `test_health.py`, `docs/operations/hosting.md` |
| Outcome measures (no marriage outcome, by design) | #46 | #89 | `docs/product/metrics.md`, `/analyst` |
| Automated accessibility checks on the routes exercised in CI | #53 | #90 | `docs/product/accessibility.md`, `a11y.spec.ts` |
| CI hardening (CodeQL, gitleaks, failing audits, coverage floors) | #58 | #87 | `.github/workflows/` |
| Linting and type checking | #59 | #88 | `pyproject.toml`, `web/biome.json` |
| Framework upgrade (Next 16, React 19, TypeScript 7) | #61 | #77, #79 | `web/package.json` |

## Not done, and why

- **Comprehension study (#44)** and **expert and native-speaker review (#45)** need real participants and reviewers and have not been run. The study protocol and analysis code are in the repository (`docs/research/study/`, `/study`), and a 30-minute review pack is ready (`docs/research/review-pack.md`). No results are claimed.
- **Hosted FHIR import and lab feed** are configured in runbooks (#107, #108) but deliberately not switched on before judging, so the live site does not change during evaluation. Everything runs against seeded synthetic sandboxes.
- **SMART on FHIR launch and a real laboratory partner** need a provider agreement.
- **Retiring the unused Oregon API service** is a dashboard step for after judging (`docs/operations/hosting.md`).
