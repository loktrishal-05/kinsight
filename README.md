# KinSight

A private, culturally sensitive navigator for inherited disease risk linked to
consanguinity. Built for the Future Health Digital Innovation Challenge,
Challenge 03. All people and results are fictional; no real genomes are used.

## Quick start
    cp .env.example .env
    make up        # Postgres, Redis, API, web
    make cohort    # rebuild the synthetic demo cohort
    make demo      # run the demo path
    make test

## Docs
- Build specification text: docs/SPEC.txt; plan and owners: docs/PLAN.md
- Architecture: docs/architecture.md; model card: docs/model_card.md; limitations: docs/limitations.md
- Pilot plan: docs/pilot_plan.md; mini-study protocol: docs/study/protocol.md
- Deviations / open questions / review log / rules delta: docs/DEVIATIONS.md, docs/OPEN_QUESTIONS.md, docs/REVIEWS.md, docs/RULES_DELTA.md
- Data sources and licences: DATA_SOURCES.md

## Local run without Docker
    pip install -e ".[dev,api]" && python -m pytest -q
    python scripts/make_demo_cohort.py && python scripts/demo.py
    cd web && npm ci && npm run dev      # mock API mode by default (NEXT_PUBLIC_MOCK=1)

## Run the web app against the live demo API
    KINSIGHT_DEMO=1 KINSIGHT_DEMO_AUTH=1 KINSIGHT_TOKEN_SECRET=<32+ bytes> KINSIGHT_AUDIT_SALT=<32+ bytes>       python -m uvicorn services.api.main:app --port 8000
    cd web && NEXT_PUBLIC_MOCK=0 npm run build && npm start     # /api is proxied to KINSIGHT_API_URL (default :8000)
    # checks: LIVE_API=http://localhost:8000 npx vitest run tests/live.test.ts ; npx playwright test -c playwright.live.config.ts
