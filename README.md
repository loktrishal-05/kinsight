<div align="center">

<img src="web/public/kin-logo.png" alt="KinSight logo" width="96" />

# KinSight

**A private, culturally sensitive navigator for inherited disease risk linked to consanguinity.**

It turns a premarital or preconception screening result into plain words, shows what it means for a couple,<br/>
keeps a genetic counsellor in the loop, and never tells anyone what to decide.

[![Live demo](https://img.shields.io/badge/live%20demo-kinsight--five.vercel.app-1d7f7a?style=for-the-badge)](https://kinsight-five.vercel.app)

[![CI](https://github.com/loktrishal-05/kinsight/actions/workflows/ci.yml/badge.svg)](https://github.com/loktrishal-05/kinsight/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-14-18272c)
![Languages](https://img.shields.io/badge/languages-7-33417f)
![Tests](https://img.shields.io/badge/tests-585%20passing-1d7f7a)

Built for the **Future Health Digital Innovation Challenge, Challenge 03**.

### 🔗 Try it live: **[kinsight-five.vercel.app](https://kinsight-five.vercel.app)**

<sub>No install and no account. Click **Sign in**, then **Use the demo account**, or press **Watch the guided demo** for a
self-driving 3-minute tour of every feature. Switch language from the menu in the top bar (seven languages).</sub>

<img src="docs/screenshots/01-landing.jpg" alt="KinSight landing page: a sunlit 3D lattice screen behind the headline" width="100%" />

> **Fictional demo.** Every person, family and result in KinSight is synthetic. No real genomes or personal data exist anywhere in the system.

</div>

---

## Contents

- [Why KinSight](#why-kinsight)
- [What it does](#what-it-does)
- [Screens](#screens)
- [System architecture](#system-architecture)
- [Workflows](#workflows)
- [Safety, privacy and governance](#safety-privacy-and-governance)
- [Seven languages](#seven-languages)
- [Quality and evaluation](#quality-and-evaluation)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Project status and roadmap](#project-status-and-roadmap)
- [Documentation](#documentation)

---

## Why KinSight

Premarital and carrier-screening programmes in regions where marrying relatives is common run into the same problems
again and again (sources in [docs/RESEARCH.md](docs/RESEARCH.md)):

| Problem seen in real programmes | What KinSight does |
|---|---|
| Too few genetic counsellors | Triage tiers: simple results are explained safely; complex ones wait for a counsellor, who works from a one-page brief |
| Numbers are misread; "1 in 4" sounds like a verdict | Natural frequencies, a 100-person icon array and a Punnett square; "an estimate, not a diagnosis" |
| Fear of stigma, blame and family honour | Neutral wording ("found / not found", never positive/negative), no red/green, a non-stigma test suite |
| Results are not shared with relatives who need them | A family circle with no-result invitations and gentle conversation starters |
| People drop off after the result | A referral state machine with owners, due dates and overdue flags |
| Language and literacy gaps | Seven languages, two reading levels, read-aloud, glossary, larger text and contrast |
| Privacy fears | Consent checked on every read, one-tap revoke, an access trail, a tamper-evident audit chain |

## What it does

<table>
<tr>
<td width="50%" valign="top">

**For couples and individuals**
- Personal result in calm, neutral words, at a basic or standard reading level
- Couple view released only after **both** partners agree and, for tier 3, a counsellor approves
- Teach-back check ("a short check, never a test") with a gentle re-explanation
- The path from result to care, with equal options and values questions
- Family circle, take-home summary, consent and privacy centres
- **Kin**, a chat and voice assistant that only ever talks about your own result

</td>
<td width="50%" valign="top">

**For professionals**
- **Counsellor console**: filterable queue, workload, one-page case brief, approve / edit / hold, referral events that cannot close without evidence
- **Analyst dashboard**: anonymous totals only (small cells suppressed), carrier burden, time to care, equity across languages and literacy, a capacity simulator
- **Governance**: hash-chained audit that detects tampering, policy, model card, data sources
- **Methods**: every formula, assumption and kinship value on one page

</td>
</tr>
</table>

Plus a cinematic public landing page, a demo sign-in with a background film, and a **42-step guided demo** that drives every
feature on its own (`/?demo=1`).

## Screens

<table>
<tr>
<td width="50%" valign="top"><img src="docs/screenshots/03-landing-chance.jpg" alt="Landing" /><br/><b>Landing</b><br/><sub>A 3D lattice opens onto a family tree, whose members settle into 100 lights: a 1 in 4 chance.</sub></td>
<td width="50%" valign="top"><img src="docs/screenshots/06-result.jpg" alt="My result" /><br/><b>My result</b><br/><sub>Found or not found, and a verified explanation in plain words.</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/screenshots/17-couple.jpg" alt="Couple view" /><br/><b>Couple view</b><br/><sub>Released only after both partners agree and a counsellor approves.</sub></td>
<td width="50%" valign="top"><img src="docs/screenshots/12-counsellor.jpg" alt="Counsellor console" /><br/><b>Counsellor console</b><br/><sub>Filterable queue, workload and a one-page case brief.</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/screenshots/13-analyst.jpg" alt="Analyst dashboard" /><br/><b>Analyst dashboard</b><br/><sub>Anonymous totals with small cells suppressed.</sub></td>
<td width="50%" valign="top"><img src="docs/screenshots/19-hindi-result.jpg" alt="Seven languages" /><br/><b>Seven languages</b><br/><sub>The whole app, including verified explanations, in the reader's language.</sub></td>
</tr>
</table>

<details>
<summary><b>More screens</b> (15 more, plus phone views)</summary>
<br/>

<table>
<tr>
<td width="33%" valign="top"><img src="docs/screenshots/02-landing-tree.jpg" alt="Landing: family tree" /><br/><sub>Landing: family tree</sub></td>
<td width="33%" valign="top"><img src="docs/screenshots/04-signin.jpg" alt="Sign-in" /><br/><sub>Sign-in</sub></td>
<td width="33%" valign="top"><img src="docs/screenshots/05-home.jpg" alt="App home" /><br/><sub>App home</sub></td>
</tr>
<tr>
<td width="33%" valign="top"><img src="docs/screenshots/07-kin.jpg" alt="Kin assistant" /><br/><sub>Kin assistant</sub></td>
<td width="33%" valign="top"><img src="docs/screenshots/08-understand.jpg" alt="Check understanding" /><br/><sub>Check understanding</sub></td>
<td width="33%" valign="top"><img src="docs/screenshots/09-next.jpg" alt="Next steps" /><br/><sub>Next steps</sub></td>
</tr>
<tr>
<td width="33%" valign="top"><img src="docs/screenshots/10-family.jpg" alt="Family circle" /><br/><sub>Family circle</sub></td>
<td width="33%" valign="top"><img src="docs/screenshots/11-privacy.jpg" alt="Privacy centre" /><br/><sub>Privacy centre</sub></td>
<td width="33%" valign="top"><img src="docs/screenshots/14-analyst-capacity.jpg" alt="Time to care and equity" /><br/><sub>Time to care and equity</sub></td>
</tr>
<tr>
<td width="33%" valign="top"><img src="docs/screenshots/15-governance.jpg" alt="Governance" /><br/><sub>Governance</sub></td>
<td width="33%" valign="top"><img src="docs/screenshots/16-methods.jpg" alt="Methods and evidence" /><br/><sub>Methods and evidence</sub></td>
<td width="33%" valign="top"><img src="docs/screenshots/18-guided-demo.jpg" alt="Guided demo" /><br/><sub>Guided demo</sub></td>
</tr>
<tr>
<td width="33%" valign="top"><img src="docs/screenshots/20-tamil-landing.jpg" alt="Tamil" /><br/><sub>Tamil</sub></td>
<td width="33%" valign="top"><img src="docs/screenshots/21-arabic.jpg" alt="Arabic, right to left" /><br/><sub>Arabic, right to left</sub></td>
<td width="33%" valign="top"><img src="docs/screenshots/22-malayalam-learn.jpg" alt="Malayalam" /><br/><sub>Malayalam</sub></td>
</tr>
</table>

<img src="docs/screenshots/phone-strip.jpg" alt="Phone screens: landing, sign-in, result, Telugu learn" width="100%" />

</details>

---

## System architecture

KinSight is a **deterministic core with humans in the loop**. Every number comes from a pure genetics engine; words come only
from approved templates checked by a verifier; consent is enforced on every read; counsellors gate high-impact results.

```mermaid
flowchart TB
  subgraph Users
    P["Couples and individuals<br/>(phone first)"]
    R[Relatives]
    C[Genetic counsellors]
    A[Analysts]
    G[Auditors]
  end

  subgraph Web["Web app · Next.js 14 (web/)"]
    L["Public landing<br/>three.js 3D hero"]
    S["Demo sign-in<br/>background film"]
    UI["App screens<br/>result · couple · family · consents · privacy<br/>counsellor · analyst · governance · methods"]
    K["Kin assistant<br/>chat + browser voice"]
    D["Guided demo<br/>42 steps"]
    I18N["i18n · 7 languages<br/>messages/ + content/"]
  end

  subgraph API["API · FastAPI (services/api)"]
    AUTH["Persona auth<br/>signed tokens"]
    ROUTES["/api/me · /api/cases · /api/counsellor<br/>/api/analytics · /api/governance · /api/copilot"]
  end

  subgraph Core["Core services (Python)"]
    CONSENT["Consent vault<br/>decide() default deny<br/>field projection"]
    AUDIT[("Hash-chained<br/>audit log")]
    ENGINE["Genetics engine<br/>kinship · couple risk · tiers<br/>no network, no model, no randomness"]
    AGENTS["Agents · LangGraph case graph<br/>select → render → verify<br/>counsellor gate · teach-back · referral"]
    ANALYTICS["Analytics<br/>comprehension · capacity<br/>small-cell suppression"]
    COHORT["Synthetic cohort<br/>seeded generator"]
  end

  subgraph Config["Configuration, not code"]
    CFG["configs/*.yaml<br/>panel · escalation · wording · case · capacity · flags"]
    TPL["templates/lang/<br/>approved blocks · labels · wording · quiz"]
  end

  subgraph Stores
    PG[("PostgreSQL 16")]
    RD[("Redis 7")]
    CK[("Graph checkpoints<br/>SQLite / Postgres")]
  end

  P & R & C & A & G --> L --> S --> UI
  UI <--> K
  UI --- I18N
  D -. drives .-> UI
  UI -->|HTTPS JSON| AUTH --> ROUTES
  ROUTES --> CONSENT --> AUDIT
  CONSENT --> ENGINE & AGENTS & ANALYTICS
  AGENTS --> ENGINE
  ENGINE --- CFG
  AGENTS --- TPL
  COHORT --> PG
  ROUTES --- PG & RD
  AGENTS --- CK
```

**Design principles** (build specification, section 3)

| Principle | How it is enforced |
|---|---|
| Deterministic core, model at the edge | `services/genetics` is pure code. The explainer (Mode A) only **selects** approved template blocks; an optional model rewrite (Mode B, behind a flag) is discarded unless it passes every check. |
| Consent first | Every read goes through `services.consent.policy.decide()` (default deny, field projection, one audit event per decision). No export route exists, and a test enforces that. |
| Humans close the loop | Tier 3 cases stop at `counsellor_gate`; a referral cannot close without recorded evidence. |
| Configuration, not code | Panels, escalation rules, wording, case timings, capacity and languages live in `configs/` and `templates/`. |
| Everything measured | Golden files, a 40-couple evaluation gate, a 109-prompt red-team set, privacy and non-stigma suites, end-to-end browser tests. |

## Workflows

### 1. From screening result to released explanation

```mermaid
flowchart TD
  R["Screening result per partner<br/>found · not found · not clear"] --> E["Genetics engine<br/>kinship φ, per-pregnancy chance, tier 1–3"]
  E --> SEL["Select approved blocks<br/>for this language and reading level"]
  SEL --> REN["Render: fill slots with the engine's numbers<br/>(nothing is written freely)"]
  REN --> V{"Verifier · 7 checks<br/>allowed blocks · mandatory blocks<br/>numbers equal engine · no stray digits<br/>banned and stigmatising phrases<br/>readability band · rewrite entailment"}
  V -- fail --> RT{"Retry ≤ 2"}
  RT -- still failing --> GATE
  RT -- retry --> SEL
  V -- pass, tier 1–2 --> REL["Release to the person"]
  V -- pass, tier 3 --> GATE["Counsellor gate<br/>approve · edit · hold"]
  GATE -- approve --> REL
  REL --> TB["Teach-back check (5 questions)"]
  TB -- "missed" --> RE["Gentle re-explanation<br/>second try, never loops"]
  RE --> TB2{"Passed?"}
  TB2 -- no --> OFFER["Offer a counsellor"]
  TB -- passed --> REF["Referral tracker"]
  TB2 -- yes --> REF
  OFFER --> REF
```

### 2. Case and referral lifecycle

```mermaid
stateDiagram-v2
  direction LR
  [*] --> result_released
  result_released --> counselling_requested
  counselling_requested --> counselling_done
  counselling_done --> confirmatory_requested
  confirmatory_requested --> confirmatory_done
  confirmatory_done --> specialist_referral_requested
  specialist_referral_requested --> specialist_referral_done
  specialist_referral_done --> closed
  result_released --> closed: evidence or counsellor decision
  counselling_done --> closed: evidence or counsellor decision
  confirmatory_done --> closed: evidence or counsellor decision
  closed --> [*]
  note right of counselling_requested
    overdue is a flag, not a state: a timer sets it when the
    current step passes its due date; the next transition clears it
  end note
```

The path is linear; `closed` can be reached from any step but only with closure evidence or a recorded counsellor decision.
Each case is one LangGraph thread with durable checkpoints and two interrupts (`counsellor_gate`, `teach_back`), so a case
survives a restart exactly where it stopped. Owners and due dates come from `configs/case.yaml`.

### 3. Consent-checked data access

```mermaid
sequenceDiagram
  autonumber
  actor A as Person A
  participant W as Web app
  participant API as API
  participant D as decide()
  participant L as Audit chain
  actor B as Person B
  A->>W: Agree to pool results for the couple view
  W->>API: POST /api/me/consents
  API->>L: append consent event (hash of previous entry)
  B->>W: Open couple view
  W->>API: GET couple assessment
  API->>D: actor=B, resource=couple, purpose=view, fields
  D-->>API: allow only if both partners consented (and counsellor released tier 3)<br/>fields projected to what B may see
  API->>L: append access event
  API-->>W: projected result
  A->>W: Revoke sharing (one tap)
  W->>API: POST /api/me/consents/{id}/revoke
  B->>W: Open couple view again
  API->>D: decide()
  D-->>API: deny (immediately)
  API-->>W: neutral message, nothing revealed
```

### 4. Kin, the assistant

```mermaid
flowchart LR
  Q["Question (typed or spoken)"] --> N["Normalise<br/>NFKC, strip bidi marks, 2000 chars"]
  N --> DL["Detect language by script<br/>Latin · Arabic · Devanagari · Tamil<br/>Telugu · Kannada · Malayalam"]
  DL --> GU{"Safety guards<br/>English + Arabic rules always run,<br/>plus the language's own keyword lists"}
  GU -- "other people · decisions · clinical advice<br/>bulk data · prompt injection" --> REF["Polite refusal + point to a counsellor"]
  GU -- safe --> IN{"Intent"}
  IN --> T1["Glossary term"] & T2["Own verified explanation only"] & T3["Who I share with"] & T4["Open a page"] & T5["Counsellor · family · settings"]
  T1 & T2 & T3 & T4 & T5 --> OUT["Answer in the detected language<br/>(optional read-aloud)"]
```

Kin is deterministic and read-only: no model call, no server-side storage, no audio stored. Its rules mirror the Python
copilot guard and are tested against the same 109-prompt red-team set.

### 5. User journey

```mermaid
flowchart LR
  LAND["Landing page<br/>3D lattice → family tree → 100 lights"] --> SIGN["Sign-in<br/>Use the demo account"]
  LAND -. "Watch the guided demo" .-> DEMO["Guided demo<br/>42 steps, any language"]
  SIGN --> HOME["App home<br/>pick a fictional case and a role"]
  HOME --> PA["Person A / B<br/>result · couple · check · next · family · consents · privacy"]
  HOME --> CO["Counsellor<br/>queue · brief · approve · referral"]
  HOME --> AN["Analyst<br/>dashboards · capacity simulator"]
  HOME --> AU["Auditor<br/>audit chain · policy · methods"]
```

## Safety, privacy and governance

- **No model invents a number.** The engine computes every figure; the renderer fills approved sentences; the verifier rejects
  any draft whose numbers differ from the engine's. Mode B (model rewording) is off by default and falls back to the approved text.
- **Neutral, non-directive language.** Banned directive and blame phrases and a separate stigma list are checked per language,
  in templates, quiz, interface text and Kin's replies (`tests/unit/test_nonstigma.py`).
- **Default-deny consent.** Role checks and field projection on every read; revocation takes effect immediately.
- **Tamper-evident audit.** Every decision is appended to a hash chain; the governance page verifies it and can run a tamper test.
- **Privacy in analytics.** Only aggregates, cells under 10 suppressed, a privacy budget per release, no identifiers.
- **Accountability.** Tier 3 results wait for a qualified counsellor; closing a case needs evidence.
- **Honest limits.** [docs/limitations.md](docs/limitations.md) and the [model card](docs/model_card.md) state what is not
  validated. The capacity simulator is labelled illustrative, not a forecast.

## Seven languages

**English · العربية · हिन्दी · தமிழ் · తెలుగు · ಕನ್ನಡ · മലയാളം**, chosen from the language menu in the top bar. Everything
follows the choice:

| Layer | Where it lives |
|---|---|
| Interface text, demo narration, methods, case names | `web/messages/<lang>.json` |
| Learn hub, Kin's replies, keywords and safety lists | `web/content/<lang>.json` |
| Verified explanations (basic + standard), quiz, condition names, wording rules | `templates/<lang>/` |
| Fonts | Noto Sans per script, downloaded only when that script is on screen |
| Layout | Arabic mirrors right to left; Indian scripts get roomier display type |

Adding a language is files only, with no code changes. Translations other than English are drafts marked **placeholder**
until a native speaker and a genetics reviewer sign them off ([docs/REVIEWS.md](docs/REVIEWS.md)).

## Quality and evaluation

Reproducible from the committed seed ([docs/SCORECARD.md](docs/SCORECARD.md), `python scripts/scorecard.py`):

| Measure | Result |
|---|---|
| Synthetic cohort | 1,500 couples · consanguinity share 0.512 · mean inbreeding coefficient 0.0203 |
| Explanation drafts (40 golden couples × 7 languages × 2 levels) | **560** · numeric fidelity **100%** · block conformity **100%** · banned phrases **0** |
| Assistant red-team set | **109 / 109** refused or answered safely |
| Analytics privacy | cells under 10 suppressed · budget 2.0 (0.5 per release) |
| Time to counsellor contact (illustrative simulation) | first-come: median 1.7 d · tier priority: median 0.6 d, tier 3 within window 100% |
| Comprehension | **Not measured yet:** the volunteer study has not been run (see below) |

| Test suite | Count |
|---|---|
| Python (unit, property, golden, integration, privacy, red-team, eval gate, study analysis) | 491 |
| Web unit (Vitest: Kin rules, multilingual guards, mock API, study scoring) | 32 |
| End-to-end (Playwright, desktop + phone: demo path, guided demo, landing, sign-in, volunteer study, Kin with stubbed speech) | 62 |

CI runs ruff, pytest, the demo path, a secret scan, TypeScript checks, Vitest, a production build and Playwright on every push.

## Tech stack

| Area | Technology |
|---|---|
| Web | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query, three.js (lazy-loaded WebGL) |
| Type | Bricolage Grotesque, Plus Jakarta Sans, Reem Kufi, Noto Sans (Arabic, Devanagari, Tamil, Telugu, Kannada, Malayalam) |
| API | FastAPI, Pydantic v2, signed persona tokens |
| Workflow | LangGraph case graph with durable checkpoints (SQLite locally, Postgres in Compose) |
| Data | PostgreSQL 16, Redis 7, SQLAlchemy + Alembic migrations, YAML configuration |
| Testing | pytest + Hypothesis, Vitest, Playwright |
| Delivery | Docker Compose, GitHub Actions |

## Repository layout

```
kinsight/
├── services/
│   ├── genetics/     pure engine: pedigree, kinship, couple assessment, tiers
│   ├── agents/       case graph, renderer, verifier, quiz, referral, brief, copilot guard, Mode B, eval
│   ├── consent/      decide(), roles, sharing, hash-chained audit, aggregates
│   ├── analytics/    comprehension and capacity simulation
│   ├── cohort/       seeded synthetic families, couples and screening results
│   └── api/          FastAPI app, schemas, demo backend
├── configs/          panel, escalation, wording, case, capacity, privacy, flags, llm
├── templates/<lang>/ approved explanation blocks (basic, standard), labels, wording, quiz
├── web/
│   ├── app/          landing (/), sign-in, home and every app route
│   ├── components/   3D hero, Kin, guided demo overlay, pedigree, visuals, shell
│   ├── lib/          API adapters (mock and live), i18n, demo script, assistant rules
│   ├── messages/     interface text per language
│   ├── content/      Learn and Kin packs per language
│   └── e2e/, tests/  Playwright and Vitest suites
├── scripts/          cohort, demo, fixtures export, scorecard
├── tests/            Python suites (unit, property, golden, integration, red-team, evals)
├── docs/             specification, research, architecture, model card, pilot, study protocol, screenshots
└── docker-compose.yml, Dockerfile.api, Makefile
```

## Getting started

**Online:** the demo is deployed at **[kinsight-five.vercel.app](https://kinsight-five.vercel.app)** (Vercel, `web/` as the root
directory, demo mode with fictional data, redeployed automatically on every push to `main`). Run it yourself with the steps below.

**Web app only (mock API, fastest):**

```bash
cd web
npm ci
npm run dev            # http://localhost:3000 · landing → Sign in → "Use the demo account"
```

**Full stack with Docker (Postgres, Redis, API, web):**

```bash
cp .env.example .env
make up                # start everything
make cohort            # rebuild the synthetic demo cohort
make demo              # run the scripted demo path
```

**Python locally:**

```bash
pip install -e ".[dev,api]"
python scripts/make_demo_cohort.py && python scripts/demo.py
```

**Web app against the live API:**

```bash
KINSIGHT_DEMO=1 KINSIGHT_DEMO_AUTH=1 KINSIGHT_TOKEN_SECRET=<32+ bytes> KINSIGHT_AUDIT_SALT=<32+ bytes> \
  python -m uvicorn services.api.main:app --port 8000
cd web && NEXT_PUBLIC_MOCK=0 npm run build && npm start      # /api is proxied to KINSIGHT_API_URL (default :8000)
```

**Volunteer study:** open `/study` (participants) and `/study/results` (facilitator: summary and CSV export); then `python scripts/analyse_study.py <export.csv>`.

**Guided demo:** open `/?demo=1` (or `/?demo=<language code>`, e.g. `?demo=hi`). Space pauses, the arrow keys step, Esc stops.

**Demo data:** `python scripts/export_web_fixtures.py` regenerates `web/lib/fixtures/data.json` from the real engine and verified
templates (7 cases across every tier, 30 conditions, a 26-case queue, weekly series, comprehension and capacity grids) in all
seven languages. A test fails if the file drifts from the engine.

## Testing

```bash
python -m pytest -q                     # Python suites, including the 560-draft eval gate
cd web
npx tsc --noEmit && npx vitest run      # types, Kin rules and multilingual guards
npx playwright test                     # end-to-end on desktop and phone (builds the app first)
```

## Project status and roadmap

| Item | Status |
|---|---|
| Engine, consent, audit, case graph, API, web app, dashboards | Done and tested |
| Cinematic landing, demo sign-in, guided demo | Done and tested |
| Seven languages end to end | Done; translations pending native-speaker and genetics review |
| **Volunteer comprehension study** | **Tooling built and tested; study not yet run.** `/study` (consent, case, five-question check, rating), `/study/results` (summary and CSV export) and `scripts/analyse_study.py` are ready ([docs/study/protocol.md](docs/study/protocol.md)). It still needs real participants and an ethics check, so the scorecard reports comprehension as not measured and no comprehension claims are made. |
| Clinical validation, in-region hosting, accredited reviewers, real sign-in and data feed | Out of scope for a fictional demo. What a real pilot would need, with gates and decisions: [docs/PILOT_READINESS.md](docs/PILOT_READINESS.md) · [docs/pilot_plan.md](docs/pilot_plan.md) |

## Documentation

| Topic | File |
|---|---|
| Build specification and plan | [docs/SPEC.txt](docs/SPEC.txt) · [docs/PLAN.md](docs/PLAN.md) |
| Research, evaluator questions, feature plan | [docs/RESEARCH.md](docs/RESEARCH.md) |
| Architecture (detail) | [docs/architecture.md](docs/architecture.md) |
| Model card · limitations | [docs/model_card.md](docs/model_card.md) · [docs/limitations.md](docs/limitations.md) |
| Pilot readiness · pilot plan · study protocol | [docs/PILOT_READINESS.md](docs/PILOT_READINESS.md) · [docs/pilot_plan.md](docs/pilot_plan.md) · [docs/study/protocol.md](docs/study/protocol.md) |
| Scorecard · rules check · demo script | [docs/SCORECARD.md](docs/SCORECARD.md) · [docs/RULES_CHECK.md](docs/RULES_CHECK.md) · [docs/demo_script.md](docs/demo_script.md) |
| Deviations · open questions · reviews | [docs/DEVIATIONS.md](docs/DEVIATIONS.md) · [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) · [docs/REVIEWS.md](docs/REVIEWS.md) |
| Design system · product brief | [web/DESIGN.md](web/DESIGN.md) · [web/PRODUCT.md](web/PRODUCT.md) |
| Sign-in film prompts | [docs/GENERATION_PROMPTS.md](docs/GENERATION_PROMPTS.md) |
| Data sources and licences | [DATA_SOURCES.md](DATA_SOURCES.md) |

<div align="center">
<sub>KinSight is a fictional demonstration for an innovation challenge. It is not a medical device and gives no medical advice.</sub>
</div>
