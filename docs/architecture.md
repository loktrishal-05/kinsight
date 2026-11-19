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
- **Consent first.** Sensitive reads go through `services.consent.policy.decide()` for default-deny access, field projection and auditing. The route inventory identifies public, role-limited and signed lab routes. The API exposes no patient export route.
- **Humans close the loop.** Tier 3 cases stop at `counsellor_gate`; referral closure needs recorded evidence.
- **Configuration, not code.** `configs/*.yaml` (panel, cohort, escalation, wording, case, capacity), `templates/`.

## Case workflow (Graph 2, `services/agents/case_graph.py`)
`select_template → explain_agent → verify → (retry ≤2 | counsellor_gate for tier 3 or failure | release) → teach_back → check_understanding → referral_tracker`.
Two interrupts (`counsellor_gate`, `teach_back`), one thread per case, durable checkpoints (SQLite locally, Postgres saver for the compose stack). A second failed quiz offers a counsellor and never loops again.
Referral states: `result_released → counselling_requested → counselling_done → confirmatory_requested → confirmatory_done → specialist_referral_requested → specialist_referral_done`, `closed` (evidence required) and `overdue` (set by a timer, cleared by the next transition).

## Data
The generator (`services/cohort/generate.py`) builds families from a seed, writes persons/relationships/screening/couples (+ `sim_truth` in a separate folder for evaluation only) and a manifest with hashes. `make cohort` rebuilds `data/demo/`.

The optional FHIR preview maps the signed-in demo persona to its HAPI fixture on the API server. The owner policy writes the audit decision before the API reads and validates the Patient and DiagnosticReport with its linked Observations. The reader checks resource ownership and synthetic tags, and the result page displays verified findings with their source IDs. Unmapped observations retain their source IDs for counsellor follow-up and block release. Findings needing review stay outside the couple engine. [FHIR preview setup](REAL_DATA_ROLLOUT.md#preview-the-assigned-synthetic-health-record)

Lifecycle routes store owner-scoped bookings, pairing and tracking state in the API database. The signed lab feed rejects stale signatures and replayed delivery IDs. The counsellor queue joins assigned cases to consent-filtered owner records. The clinic tools use public ClinVar and gnomAD identifiers for reference checks.

## Deployment
Docker Compose (Postgres, Redis, API, web). Containers have no hard dependency on a foreign region; real health data would need in-region hosting and an approved model endpoint. Scheduler for timers is a small worker calling the API (not sleeping in graph nodes).

## Architecture decisions

[Deterministic core](adr/0001-deterministic-core.md) · [Default-deny consent](adr/0002-default-deny-consent.md) · [Counsellor review](adr/0003-counsellor-gate.md) · [Patient export](adr/0004-no-export-route.md) · [FHIR and lab integration](adr/0005-fhir-and-lab.md) · [Optional model](adr/0006-optional-model.md)

## Diagram of deviations
See `docs/DEVIATIONS.md`.
