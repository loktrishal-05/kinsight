# Contributing to KinSight

Use Python 3.11 and Node.js 22 to match CI. Install Python dependencies with `python -m pip install -e ".[dev,api]"` from the root. Run `npm ci` in `web/`. The mock web app starts with `npm run dev`. The [README](README.md#getting-started) has live API and FHIR setup.

Use a branch and a pull request linked to the issue. Explain the behavior that changed, how to reproduce the verification, and any remaining acceptance checks. Include a screenshot for visual changes.

Use fictional fixtures or approved public examples. Keep genetic calculations in the deterministic engine. Apply default-deny consent and field projection to sensitive reads. Keep complex findings behind counsellor approval, label educational estimates where readers see them, and use neutral wording.

Before requesting review, run:

```sh
python -m ruff check services tests scripts
python scripts/license_inventory.py --check
python -m scripts.sync_language_badge --check
python -m pytest -q
python scripts/demo.py
cd web
npx tsc --noEmit
npx vitest run
npx playwright test
```

For changes to lab or FHIR delivery, follow the [integration checks](docs/operations/real-data-rollout.md). Use the [security reporting policy](SECURITY.md) for vulnerabilities.
