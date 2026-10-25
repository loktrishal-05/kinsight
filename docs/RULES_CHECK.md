# Final rules check (P6-7) against spec section 1 and the data register

Status: **met**, **partial** (explained) or **open** (needs people). The full "Challenge rules" document was not available
(registration needed), so `docs/RULES_DELTA.md` is empty; re-check this table once it is read.

| Rule / requirement | Status | Evidence |
|---|---|---|
| 1. Plain, non-stigmatising explanation with uncertainty; risk vs diagnosis | met | Template-only explanations, verifier, non-stigma suite, `tests/evals` |
| 2. Values-sensitive choices; access navigation without naming facilities | met (placeholder wording) | `templates/options.yaml`, `services/agents/options.py`, Next steps screen; generic service types only |
| 3. Escalate complex findings; keep education, support and advice apart | met | Tier 3 counsellor gate, intended-use statement on governance page |
| 4. Privacy-preserving family workflows | met | `decide()` on every read, hash-chained audit, privacy suite (role-by-route, revocation, pooling, route inventory) |
| 5. Traceable path to counselling, confirmatory assessment and specialist referral | met | Referral state machine with owners and due dates; overdue handling |
| 6. Measurable comprehension and access | partial | Pipeline and scorecard exist; comprehension itself is **not measured** (study not run) |
| Health impact: time-to-care simulator, labelled illustrative | met | `services/analytics/capacity.py`, analyst screen |
| Technical depth: deterministic engine, LangGraph, verifier, consent | met | `services/*`, `docs/architecture.md` |
| Working demo, one command from a fresh clone | met | `python scripts/demo.py`; `docker compose up` verified; fresh-clone test run |
| Responsible AI: controls, governance page, red-team set | met | `docs/model_card.md`, 109-prompt red-team gate (keyword rules tuned on it: see limitations) |
| Scalability / deployment note | met | Containers, config-driven panel and languages, `docs/pilot_plan.md` |
| Commercial path: one-page pilot plan | met | `docs/pilot_plan.md` |
| Working prototype + technical docs + assumptions, dependencies, limitations | met | `docs/` set, `docs/limitations*.md`, lock files |
| Organisers provide no data; declare every source; no unneeded personal data | met | `DATA_SOURCES.md` (all synthetic), deny-list tests |
| Clean repo, no keys committed, choose a licence | **open** | No keys (CI scan); **licence not chosen** (team decision); no GPL components (pedigree viewer is custom SVG) |
| Team of 1 to 5; lead aged 18+; register first | **open** | Needs the team |
| Volunteer study: ethics check first, fictional cases only | **open** | Protocol written; not run |
| Native Arabic and genetics reviewer gates | **open** | `docs/REVIEWS.md` has no entries; nothing is marked approved |

Optional Phase 5 items (all behind `configs/flags.yaml`): Mode B rewrite (judge injected, off), options explorer and values
questions (on), counsellor brief (on), copilot + red-team (on), non-stigma suite (on), voice (on, falls back to text), private
partner check (off, unaudited demo), extra language scaffold (on; Urdu is an English-copy placeholder), FHIR-style export
(off, function only, no route).
