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
- Research, evaluator questions and feature plan: docs/RESEARCH.md
- Architecture: docs/architecture.md; model card: docs/model_card.md; limitations: docs/limitations.md
- Pilot plan: docs/pilot_plan.md; mini-study protocol: docs/study/protocol.md
- Deviations / open questions / review log / rules delta: docs/DEVIATIONS.md, docs/OPEN_QUESTIONS.md, docs/REVIEWS.md, docs/RULES_DELTA.md
- Scorecard: docs/SCORECARD.md (python scripts/scorecard.py); generated limitations: docs/limitations_generated.md
- Final rules check: docs/RULES_CHECK.md; demo script: docs/demo_script.md
- Data sources and licences: DATA_SOURCES.md

## Local run without Docker
    pip install -e ".[dev,api]" && python -m pytest -q
    python scripts/make_demo_cohort.py && python scripts/demo.py
    cd web && npm ci && npm run dev      # mock API mode by default (NEXT_PUBLIC_MOCK=1)

## Run the web app against the live demo API
    KINSIGHT_DEMO=1 KINSIGHT_DEMO_AUTH=1 KINSIGHT_TOKEN_SECRET=<32+ bytes> KINSIGHT_AUDIT_SALT=<32+ bytes>       python -m uvicorn services.api.main:app --port 8000
    cd web && NEXT_PUBLIC_MOCK=0 npm run build && npm start     # /api is proxied to KINSIGHT_API_URL (default :8000)
    # checks: LIVE_API=http://localhost:8000 npx vitest run tests/live.test.ts ; npx playwright test -c playwright.live.config.ts

## Pages
`/` is the public landing page (3D hero), `/signin` is a demo sign-in (the "Use the demo account" button fills the fields; any
non-empty username and password signs in, no real accounts), and the app starts at `/home`. Sign-in video prompts:
docs/GENERATION_PROMPTS.md (drop the clip at web/public/media/signin.mp4).

## Guided demo
Start the web app (mock mode) and click "Watch the guided demo" on the home page, or open `http://localhost:3000/?demo=1`
(`?demo=ar` for Arabic). It drives every feature in 42 narrated steps; Space pauses, arrow keys step, Esc stops.
Test: `cd web && npx playwright test e2e/demo.spec.ts`. Details: docs/RESEARCH.md section 5.

## Rich demo data
`python scripts/export_web_fixtures.py` regenerates `web/lib/fixtures/data.json` from the real engine, the verified templates and the committed demo cohort (seven couple scenarios across every tier, 30 conditions, a 26-case queue, weekly series, comprehension matrix, capacity grid). A test fails if the file drifts from the engine.
