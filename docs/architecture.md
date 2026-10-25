# Architecture

All people and results are fictional. No real genomes or personal data exist anywhere in the system.

```
web (Next.js)  ──►  services/api (FastAPI)  ──►  services/consent  decide() + audit chain   (every read)
                          │                  ├─►  services/genetics  pure engine: kinship, couple risk, tiers
                          │                  └─►  services/agents    LangGraph case graph, renderer, verifier, quiz, referral
                          └─►  services/analytics (comprehension, capacity)      services/cohort (seeded synthetic data)
```

## Principles (spec section 3)
- **Deterministic core, model at the edge.** `services/genetics` computes every figure and tier; it has no network, model, clock or randomness. The explainer only selects approved template blocks (Mode A); a verifier checks the draft.
- **Consent first.** All reads go through `services.consent.policy.decide()` (default deny, field projection, audit event per decision). No export route exists; a test enforces it.
- **Humans close the loop.** Tier 3 cases stop at `counsellor_gate`; referral closure needs recorded evidence.
- **Configuration, not code.** `configs/*.yaml` (panel, cohort, escalation, wording, case, capacity), `templates/`.

## Case workflow (Graph 2, `services/agents/case_graph.py`)
`select_template → explain_agent → verify → (retry ≤2 | counsellor_gate for tier 3 or failure | release) → teach_back → check_understanding → referral_tracker`.
Two interrupts (`counsellor_gate`, `teach_back`), one thread per case, durable checkpoints (SQLite locally, Postgres saver for the compose stack). A second failed quiz offers a counsellor and never loops again.
Referral states: `result_released → counselling_requested → counselling_done → confirmatory_requested → confirmatory_done → specialist_referral_requested → specialist_referral_done`, `closed` (evidence required) and `overdue` (set by a timer, cleared by the next transition).

## Data
The generator (`services/cohort/generate.py`) builds families from a seed, writes persons/relationships/screening/couples (+ `sim_truth` in a separate folder for evaluation only) and a manifest with hashes. `make cohort` rebuilds `data/demo/`.

## Deployment
Docker Compose (Postgres, Redis, API, web). Containers have no hard dependency on a foreign region; real health data would need in-region hosting and an approved model endpoint. Scheduler for timers is a small worker calling the API (not sleeping in graph nodes).

## Diagram of deviations
See `docs/DEVIATIONS.md`.
