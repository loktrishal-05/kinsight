# KinSight

KinSight helps people understand premarital carrier-screening results, prepare for genetic counselling, and control what they share. The project was built for Challenge 03 of the Future Health Digital Innovation Challenge.

[![CI](https://github.com/loktrishal-05/kinsight/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/loktrishal-05/kinsight/actions/workflows/ci.yml)
[![CodeQL](https://github.com/loktrishal-05/kinsight/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/loktrishal-05/kinsight/actions/workflows/codeql.yml)
![Languages](https://img.shields.io/badge/languages-7-33417f)
[![License: MIT](https://img.shields.io/badge/license-MIT-1d7f7a)](LICENSE)

[Open the fictional demo](https://kinsight-five.vercel.app/) · [Architecture](docs/architecture.md) · [Evaluator evidence](docs/JUDGE_FEEDBACK.md) · [Pilot roadmap](docs/EVALUATOR_ROADMAP.md)

## Walk through the demo

1. Open two fictional adult sessions and share for couple planning independently. A complex result waits for counsellor review. Return to the released educational explanation and check understanding.
2. Open **Report comparison** with fictional samples. Attach a PDF or photo, check each finding against its source and confirm fields individually. The comparison updates only when you run it on the current inputs. The illustrative inheritance example requires a simple matched carrier pair and an explicit inheritance selection.
3. Open **Family Planning** from the homepage, Learn, or Care Plan. The English and Arabic guide covers pregnancy preparation, spacing, inheritance and fertility questions. Choose Abu Dhabi or Saudi Arabia for official service links, then open the session preparation tool.
4. Follow the fictional lab tracker or preview a seeded HAPI R4 report. Use the integration walkthrough to test signed delivery, correct-person access, and what happens when a report is amended.

[Family Planning](https://kinsight-five.vercel.app/learn/family-planning) · [Integration walkthrough](docs/REAL_DATA_ROLLOUT.md) · [Submission checklist](docs/SUBMISSION_CHECKLIST.md)

## System architecture

| Layer | Responsibility |
| --- | --- |
| [Web](web/) | Next.js routes, i18n, accessible explanations and role-specific views. It switches between deterministic mock fixtures and HTTP. Report files and study responses follow separate browser-local paths. |
| [API](services/api/) | FastAPI request validation, demo persona identity, report intake and application routes. Protected calls go through consent and role checks before sensitive data is read or returned. |
| [Consent and workflow](services/consent/) | Default-deny access, field projection and hash-chained audit. [Lifecycle](services/lifecycle/) covers lab progression, review coordination, bookings and follow-up. |
| [Genetics](services/genetics/) | Deterministic kinship and educational risk calculations. [Agents](services/agents/) orchestrates explanations, teach-back and referrals. Kin uses fixed tools by default. An opt-in model can select tools. |
| [Integrations](services/integrations/) | Trusted FHIR resource exchange. The signed synthetic lab feed enters through the API. Release checks bind to the current report revision. |
| [Storage](migrations/) | SQLAlchemy with Alembic migrations. Local Compose uses PostgreSQL. The hosted API connects to Neon Postgres. |

See the [architecture diagrams and trust boundaries](docs/architecture.md), [threat model](docs/THREAT_MODEL.md), and [deployment and health checks](docs/HOSTING.md).

## Repository layout

| Path | Contents |
| --- | --- |
| `web/app`, `web/components`, `web/lib`, `web/messages` | Routes, UI, API adapters, browser logic and locale files |
| `services` | API, consent, genetics, workflow, integrations, synthetic cohort and analytics |
| `configs`, `templates` | Panel, policy and workflow configuration, plus draft multilingual explanations |
| `data/demo`, `scripts` | Seeded fixtures and commands for demos, fixture generation and checks |
| `migrations`, `docker-compose.yml`, `render.yaml` | Database schema and local and hosted deployment definitions |
| `tests`, `web/tests`, `web/e2e`, `web/e2e-live` | Python, web, browser and synthetic integration tests |
| `docs` | Architectural decisions, demo evidence, reviewer materials and pilot requirements |

## Getting started

Use Python 3.11 and Node.js 22 to match CI.

**Web with mock data**

```sh
cd web
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000) and start the demo.

**API and web with PostgreSQL**

```sh
cp .env.example .env
docker compose up --build
```

Set `NEXT_PUBLIC_MOCK=0` in the local `.env` before building to exercise browser-to-API requests. On PowerShell, use `Copy-Item .env.example .env` for the first command. The UI is on port 3000, and API health is on port 8000 at `/api/health`. For optional HAPI R4 seeding, the signed lab feed and correction tests, follow the [integration setup](docs/REAL_DATA_ROLLOUT.md).

## Testing

```sh
python -m pip install -e ".[dev,api]"
python -m ruff check services tests scripts
python -m pytest -q
cd web
npm ci
npm run check
npx playwright install chromium
npx playwright test --workers=1
```

[CI runs](https://github.com/loktrishal-05/kinsight/actions/workflows/ci.yml) cover the suites and hosted-style synthetic integrations. [Contributing](CONTRIBUTING.md) explains the pull request and data-handling rules.

## Demo and pilot status

The public release uses fictional identities and synthetic results. Browser-local report comparison is for fictional or public sample files. The seeded FHIR R4 and signed lab workflows have been exercised on the hosted demo. Live provider identity, SMART launch and accredited lab onboarding are pilot dependencies. The study tooling has passed a fictional dry run. Clinical sign-off, native-language review, participant evidence and partner acceptance are pending.

[Study protocol](docs/study/protocol.md) · [Reviewer pack](docs/REVIEW_PACK.md) · [Pilot readiness](docs/PILOT_READINESS.md) · [Data sources](DATA_SOURCES.md) · [MIT licence](LICENSE)
