# Hosting and reliability

| Part | Where | Notes |
| --- | --- | --- |
| Website | Vercel, `kinsight-five.vercel.app` | Real mode: `/api/*` is proxied to the API. Only `main` deploys (`web/vercel.json`); branches no longer use preview builds. |
| API | Render, `kinsight-api-va` (Virginia) | Next to the database. `/api/health` reports `database_reachable` from a real round trip. |
| Database | Neon Postgres (Washington D.C.) | Free tier; `DATABASE_URL` is never stored in the repository. |
| Keep-warm | `.github/workflows/keepalive.yml` | Pings `/api/health` every 10 minutes so the free API does not sleep before or during judging. |
| Nightly | `.github/workflows/nightly-clinvar.yml` | ClinVar re-check; live only if `KINSIGHT_NIGHTLY_DATABASE_URL` is set. |

## What visitors see when something is slow or down

- The landing page footer shows a one-line **status**: online, waking up (free hosting sleeps after a quiet spell; up to a minute), database not answering, or not reachable.
- Inside the app, the **waking notice** appears while any API call is slow.
- Every live source (ClinVar, gnomAD, MedlinePlus, ClinGen, Ensembl VEP, the HAPI sandbox) fails soft: the screen names the source that is down and the rest keeps working.
- A database problem makes `/api/health` say `degraded` with HTTP 200, so the platform does not restart a healthy process in a loop.

## Retire the unused Oregon API service (manual, in this order)

`render.yaml` still defines `kinsight-api` (Oregon). It is unused, but the Virginia service reads `DATABASE_URL` **from it** (`fromService`). Removing it from the Blueprint first would cut the live API off from its database. Do it in this order:

1. In the Render dashboard, open **kinsight-api-va -> Environment** and set `DATABASE_URL` directly (copy the value from `kinsight-api`). Save and wait for the redeploy; check `https://kinsight-api-va.onrender.com/api/health` shows `"database_reachable": true`.
2. Change the Virginia service in `render.yaml` to:
   ```yaml
   - key: DATABASE_URL
     sync: false
   ```
   and delete the `kinsight-api` (Oregon) service block. Merge after the submission freeze lifts, so `main` does not change during judging.
3. In the dashboard, suspend or delete `kinsight-api`. The Virginia service keeps its own `KINSIGHT_TOKEN_SECRET`; existing demo sign-ins on Oregon (if any) simply stop working.

## Before a judging window

- Open `https://kinsight-five.vercel.app` and check the footer says **Live service: online**.
- Run the keepalive workflow once by hand (**Actions -> keepalive -> Run workflow**) if the status says waking.
- Do not push to `main` between the deadline and the results (issue #64).
