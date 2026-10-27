# Pilot readiness: what it would take to use KinSight with real people

**Audience:** the project lead and any sponsor, ethics or clinical lead who must decide whether to go beyond the demo.
**Status of this document:** a planning aid written from the repository as it stands (see the evidence index at the end). It states
what is built, what is not, and what must be decided. Sizes and orders are rough planning guides, not commitments.

## 1. Summary

KinSight is **complete as a demonstration** and **not ready for real people**. Everything that code alone can do is built and
tested. What remains needs people, approvals and partnerships: evidence that readers understand the explanations, expert review of
the content and the formulas, real identity and data connections, security and legal sign-off, and named clinical accountability.

| Question | Answer today |
|---|---|
| Can it be demonstrated end to end, in seven languages? | **Yes** |
| Is the arithmetic correct and checkable? | Matches textbook values and golden files; **not yet reviewed by a genetics professional** |
| Is there evidence people understand it? | **No.** The volunteer study tooling is built; the study has not been run |
| Is non-English text approved? | **No.** Every non-English string and template is a machine draft marked `placeholder` |
| Can real people sign in and real results flow in? | **No.** Sign-in is a demo; there is no lab or results connection |
| Could a regulator or hospital accept it? | **Not yet.** No clinical-safety case, security test, data-protection assessment or named accountable clinician |

**Recommendation.** Do not describe KinSight as usable by the public. Describe it as a validated-by-test, evidence-pending
prototype. The path to a limited, supervised pilot is in section 4; the decisions needed to start it are in section 5.

## 2. What is already in place (and cheap to reuse)

| Capability | State | Where |
|---|---|---|
| Deterministic genetics engine (kinship, couple risk, tiers) | Built, tested (golden files, property tests) | `services/genetics`, `tests/` |
| Approved-wording pipeline with a verifier (numbers equal the engine's, banned and stigmatising phrases, readability) | Built; 560 of 560 drafts verified across 7 languages | `services/agents`, `docs/SCORECARD.md` |
| Consent on every read, hash-chained audit, analytics suppression | Built, tested | `services/consent`, `tests/integration` |
| Counsellor gate and referral tracking with evidence required to close | Built, tested | `services/agents/case_graph.py`, `referral.py` |
| Role screens (person, relative, counsellor, analyst, auditor) | Built, 62 end-to-end tests | `web/` |
| Volunteer-study tooling (consent, check, results, CSV, analysis script) | Built, tested | `/study`, `scripts/analyse_study.py` |
| Capacity simulator for sizing counsellor time | Built, **illustrative** until local arrival data exists | `configs/capacity.yaml` |
| Containers, migrations, config-driven panel and languages | Built | `docker-compose.yml`, `configs/`, `migrations/` |

## 3. Workstreams to close the gaps

Each item lists what is missing, who must be involved, and the "done when" test. Size: S = days of work after inputs arrive,
M = weeks, L = months, mostly waiting on people or approval.

### A. Evidence that people understand (size L, blocks everything public)
- **Missing:** the volunteer study has not run; the dashboard's comprehension numbers are scripted test inputs.
- **Needs:** ethics approval (the college or the host institution), volunteers per language, a facilitator, reviewed consent text.
- **Order:** review the translations for any language first (workstream B); otherwise results mix wording quality with comprehension.
- **Done when:** `scripts/analyse_study.py` reports n and pass rate per language and level; the gap between groups is at or under
  10 points or the cause is understood and fixed; the most-missed questions have led to reviewed template changes.

### B. Language and content review (size M per language, runs in parallel)
- **Missing:** native-speaker and genetics sign-off. Arabic, Hindi, Tamil, Telugu, Kannada and Malayalam are machine drafts
  (explanation blocks at two reading levels, quiz, wording rules, interface, Learn, Kin, study consent). Urdu is a hidden placeholder.
- **Needs:** two reviewers per language (a native speaker with health-communication experience and a genetics professional),
  recorded in `docs/REVIEWS.md`; wording rules per language reviewed by the same people.
- **Suggestion:** pilot in English plus the one or two languages the site actually needs, rather than all seven.
- **Done when:** every approved item shows both reviewers and a date in `docs/REVIEWS.md` and its template `status` is no longer
  `placeholder`; the non-stigma and verification suites still pass on the reviewed text.

### C. Clinical validation of the science (size M)
- **Missing:** review of the formulas, assumptions, panel, frequencies, sensitivities and the tier and escalation rules by a
  clinical geneticist. The 30-condition panel is illustrative; the 1990s consanguinity-share defaults are dated.
- **Needs:** a named clinical geneticist (or the programme's genetics service), the real condition panel and local frequencies.
- **Done when:** the model card and `docs/RULES_DELTA.md` record the review, the panel is replaced by the real one, the golden files
  are regenerated and approved, and every limitation that no longer applies is removed from `docs/limitations.md`.

### D. Identity, access and security (size M to L)
- **Missing:** real sign-in (today any username and password works), identity from the service's own provider, multi-factor for
  counsellors, session policy, secrets management, rate limiting, an external anchor for the audit chain's head hash (the code
  supports it; it is not provisioned), a penetration test and a security review.
- **Gap in CI:** dependency audit is report-only (`pip-audit || true`) and there is no JavaScript audit; both should block on
  high-severity findings before a pilot.
- **Done when:** counsellors and users authenticate through the host's identity system, roles map to the existing consent policy,
  a third-party test has no open high findings, and audit tail truncation is detectable.

### E. Data integration (size M)
- **Missing:** any connection to a lab or screening system. The planned shape is a minimal feed (alias, condition id, status) with
  no names, national ids, dates of birth or locations; a FHIR export exists as a function with no route.
- **Needs:** the lab or information-system owner, an agreed interface, data-quality rules, a plan for corrections and missing results.
- **Done when:** a test feed from the real system produces correct cases in a staging environment, with rejected or ambiguous
  records routed to a human and never explained automatically.

### F. Clinical safety, staffing and governance (size M, and a hard requirement)
- **Missing:** a named accountable clinician, a clinical-safety case and hazard log, an incident and escalation procedure, counsellor
  staffing sized with local arrival data (the simulator is illustrative), a statement of intended use.
- **Check early:** whether the tool counts as medical-device software in the target jurisdiction. The answer changes the whole
  approval route; get it from the regulator or the host's regulatory officer, not from the project team.
- **Done when:** the accountable clinician signs the safety case; every tier 3 result has a defined human owner and response time.

### G. Legal, privacy and hosting (size M)
- **Missing:** a data-protection impact assessment, legal review of the consent text and retention/deletion rules, in-region
  hosting, a data-processing arrangement with the host, and an approved model endpoint if any model is ever used (the pipeline
  needs none: explanations come from approved templates).
- **Licence:** no licence file exists and the repository is public, so the default is all rights reserved. Choose one deliberately
  (see section 5) and complete a licence inventory of dependencies before any distribution.
- **Done when:** the assessment is approved by the host's data-protection officer and hosting is in the permitted region.

### H. Kin assistant hardening (size S to M)
- **Missing:** the red-team set has 109 prompts in English (87) and Arabic (22) only, and its keyword rules were tuned on that set,
  so a pass is a regression gate, not evidence of robustness. The five Indian languages have working guards and smoke tests but
  **no adversarial test set**. Kin also matches keywords and will miss some phrasings.
- **Needs:** fresh adversarial prompts written by native speakers in each pilot language, and a model judge (kept optional).
- **Done when:** each pilot language has a held-out adversarial set with zero unsafe answers, and misses fall back to a polite
  refusal pointing to a counsellor.

### I. Operations (size S to M)
- **Missing:** in-region deployment, backups and restore tests, monitoring and alerting, an on-call owner, a scheduler worker for
  overdue timers, and a clean demo-reset story (resetting keeps consent rows and the audit chain, so a re-run on the same database
  fails; the workaround is `docker compose down -v`).
- **Done when:** a restore drill succeeds, alerts reach a named person, and the overdue timer runs unattended.

## 4. Suggested sequence with go / no-go gates

| Gate | Contents | Pass criteria |
|---|---|---|
| **0. Demo (now)** | All code built and tested; honest limits published | Met |
| **1. Evidence and review** | Workstreams A, B, C for the pilot languages; licence chosen | Study report in hand; reviewers recorded; genetics review recorded |
| **2. Secure build** | D, E, G, H, I in a staging environment with the host's systems | Penetration test clean; test feed correct; DPIA approved |
| **3. Supervised pilot** | One service, counsellors review **every** result before release (no tier shortcuts), limited volume | Safety case signed (F); incident process live; stop criteria below agreed in advance |
| **4. Decision** | Review pilot measures | Understanding gap within target; time to counsellor contact improved; zero privacy incidents |

**Stop criteria for the pilot (agree before it starts):** any privacy incident; any explanation found to steer or blame; a
counsellor reports a wrong figure; understanding in any language group falling well below the others without a fix; or sponsor
or ethics request.

**Measures** (from `docs/pilot_plan.md`): quiz pass rate and gap by language and level; counselling uptake; days from result to
counsellor contact and to confirmatory assessment; privacy incidents; consent-revocation latency. Cancelled marriages are **not** a
success measure.

## 5. Decisions needed from the project lead

1. **Where and with whom?** The jurisdiction and the host service decide the regulator, the data law and the hosting region.
2. **Which languages first?** Recommend English plus one or two, so review and study effort is not spread across seven.
3. **Who are the reviewers?** A clinical geneticist and, per language, a native-speaking health communicator. Names go in `docs/REVIEWS.md`.
4. **Which ethics body will approve the volunteer study,** and can it run before any translation work is finished?
5. **Which licence?** Options include a permissive licence, a copyleft licence, or all rights reserved with a separate pilot agreement.
6. **Who is the accountable clinician,** and who is the data-protection officer for the host?
7. **Hosting:** which in-region provider, and whether any model endpoint will ever be used.

## 6. Non-goals and standing commitments

- KinSight explains and supports; it does not diagnose, direct decisions or replace counsellors.
- It never uses "positive" or "negative" for carrier status, never uses red/green for it, and never counts cancelled marriages as success.
- No real person's data may enter the demo or study environments.

## 7. Evidence index

| Claim | Where to verify |
|---|---|
| 560 drafts, 100% numeric fidelity, 0 banned phrases | `docs/SCORECARD.md`, `python scripts/scorecard.py` |
| 109-prompt red-team set (en 87, ar 22) | `tests/redteam/prompts.yaml` |
| Test counts (Python 491, Vitest 32, Playwright 62) and CI | `.github/workflows/ci.yml`, GitHub Actions |
| Known limitations | `docs/limitations.md`, `docs/limitations_generated.md` |
| Review gate (empty) | `docs/REVIEWS.md` |
| Pilot plan (buyer map, integration, measures) | `docs/pilot_plan.md` |
| Study protocol and tooling | `docs/study/protocol.md`, `/study`, `/study/results`, `scripts/analyse_study.py` |
| Architecture and principles | `docs/architecture.md`, `README.md` |
| Model card | `docs/model_card.md` |
