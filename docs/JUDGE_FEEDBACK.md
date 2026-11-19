# Early-review feedback: what we built

The early review (18 Nov 2026) asked for the items below. Each row links the request to the issue, the merged pull request, the screen where it can be seen, and the tests that keep it true. Status is **Built** only when it is merged and tested; anything partial says what is missing.

> *"integrate live laboratory interfaces and electronic health records (EHR/FHIR) alongside automated lab-report parsing ... expand "Kin" and family-circle tools into an interactive, personalized pre-counseling preparation suite — what-if family planning scenarios, extended family cascade screening, tailored questions ahead of specialist consultations ... while strictly maintaining default-deny consent and privacy guardrails, labelling risk calculations as educational estimates rather than diagnoses, and ensuring human genetic counselors approve and guide all complex or high-risk findings."*

| Request | Issue | Pull request | Where to see it | Tests | Status |
| --- | --- | --- | --- | --- | --- |
| Live laboratory interfaces | #30 | #85 and earlier HL7 work | `/journey` lab tracker, `/lab-sandbox` | `test_lab_feed.py`, `test_hl7_lab.py`, `e2e-live/lab-sandbox.spec.ts` | Built for a signed synthetic HL7 v2 and FHIR feed. A real laboratory connection needs a partner. |
| Electronic health records (FHIR import) | #28 | #85 | `/result` "Health record preview", counsellor review | `test_fhir_preview.py`, `test_fhir_seed.py`, `e2e-live/fhir-preview.spec.ts` | Built against a seeded HAPI R4 sandbox. Hosted SMART launch is not done. |
| EHR referral write-back | #29 | #85 | counsellor console referral status | `test_fhir_referral.py`, `e2e-live/fhir-referral.spec.ts` | Built (ServiceRequest and Task, consented, idempotent). |
| Automated lab-report parsing | #31 | #85 and earlier | `/report-compare` | `report-compare.test.ts`, `report-compare.spec.ts` | Built for text PDFs and structured text with PDF signature, size and page checks. Photo OCR is not done. |
| Expand Kin | #35 | #85 | Kin on every page | `assistant.test.ts`, `assistant.spec.ts` | Built as a deterministic tool-using assistant (scenario and preparation actions). An optional model-backed mode is not done. |
| Pre-counselling preparation suite | #36 | #81 | `/prepare` | `test_prep.py`, `prep.test.ts`, `prepare.spec.ts` | Built: values, concerns, suggested and own questions, bring-along list, printable sheet. |
| Tailored questions ahead of consultations | #36 | #81 | `/prepare`, Questions step | `test_prep.py` (deterministic, neutral, ordered) | Built from a reviewed English and Arabic question bank; other languages show English and say so. |
| What-if family-planning scenarios | #37 | #82 | `/plan/scenarios` | `test_scenarios.py` (Hypothesis and 10 golden cases), `scenario.test.ts`, `scenarios.spec.ts` | Built: per pregnancy, at least one of N, untested partner by relationship, neutral description of each route. |
| Extended-family cascade screening | #38 | #86 | `/cascade`, relatives use `/invite` | `test_cascade_engine.py`, `test_cascade_tracker.py`, `cascade.spec.ts` | Built: kinship-based chance per relative, private invite, anonymous notice, outcomes reported back without revealing the sender. |
| Family-circle tools | #39 | — | `/family` | `pedigreeLayout.test.ts` | The family tree view and question flow exist. The editable pedigree builder is planned for the finale. |
| Default-deny consent and privacy guardrails | #42, #60 | #83 and earlier | `/consents`, `/privacy`, `/governance` | `test_route_consent_inventory.py`, `test_privacy.py`, `test_http_hardening.py`, `security-headers.spec.ts` | Built: every route classified and audited, CSP and CORS allow-list, threat model in `docs/THREAT_MODEL.md`. |
| Risk shown as an educational estimate, not a diagnosis | #41 | #80 | every figure, for example `/couple` | `test_estimate_label.py`, `estimate-label.spec.ts` (every page, all 7 languages) | Built: the API cannot return a bare risk number; every figure on screen carries the label and a method link. |
| Counsellors approve complex and high-risk findings | #40 | #84 | counsellor console "To review"; person sees a waiting notice | `test_review_queue.py`, `review-queue.spec.ts` | Built: one queue for couple results, imports, lab reports, requests and reclassifications; result-releasing items are approved only in their revision-bound review. |

## Also done for this submission

| Area | Issue | Pull request | Evidence |
| --- | --- | --- | --- |
| Outcome measures (no marriage outcome, by design) | #46 | #89 | `docs/METRICS.md`, `/analyst` |
| Accessibility, WCAG 2.2 AA verified in CI | #53 | #90 | `docs/ACCESSIBILITY.md`, `a11y.spec.ts` |
| CI hardening (CodeQL, gitleaks, failing audits, coverage floors) | #58 | #87 | `.github/workflows/` |
| Linting and type checking | #59 | #88 | `pyproject.toml`, `web/biome.json` |
| Framework upgrade (Next 16, React 19, TypeScript 7) | #61 | #77, #79 | `web/package.json` |

## Not done, and why

- **Comprehension study (#44)** and **expert and native-speaker review (#45)** need real participants and reviewers. The study protocol and analysis code are in the repository (`docs/study/`, `/study`); no results are claimed.
- **Hosted SMART on FHIR and a real laboratory partner** need a provider agreement; everything runs against seeded synthetic sandboxes.
- **Photo OCR of reports** and an **optional model-backed Kin** are planned; the deterministic paths are what the demo uses.
