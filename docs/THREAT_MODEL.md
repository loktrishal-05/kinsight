# Threat model

KinSight is a fictional, synthetic-data demonstration of a genetic-counselling workflow. The model below still treats the data as if it were sensitive, because the design has to hold when real data arrives. Each threat names its control and the test that fails if the control breaks.

**Assets:** a person's result and family tree; the couple's pooled view; the counsellor's case notes and preparation sheets; the audit chain.
**Actors:** person, partner, relative, counsellor, analyst, auditor, demo operator, an outside party on the network, a malicious lab or integration.
**Boundary:** browser, Next.js app, FastAPI service, database, and the signed feeds and public reference services around them.

## STRIDE

| | Threat | Control | Test |
| --- | --- | --- | --- |
| **S**poofing | Acting as another person or role | Signed, expiring bearer tokens; role gate on every route; persona login only in demo mode | `tests/integration/test_api_privacy.py`, `test_route_consent_inventory.py` |
| **S**poofing | A forged lab update | Signed envelope, time window, persistent delivery ids | `tests/integration/test_lab_feed.py` |
| **T**ampering | Edited audit history | Salted hash chain, external head check, visible broken entry | `tests/unit/test_consent_audit.py` |
| **T**ampering | A result changed after a counsellor approved it | Approval bound to a report revision or snapshot; stale imports refuse release | `tests/integration/test_fhir_preview.py`, `test_lab_sandbox.py` |
| **R**epudiation | Denying a read or a consent | One audit event per decision, including refusals, with content-free fields | `tests/integration/test_route_consent_inventory.py` |
| **I**nformation disclosure | Reading someone else's data | Default-deny policy, owner-first, assignment and time limit for counsellors, field projection | `tests/integration/test_privacy.py` |
| **I**nformation disclosure | Cross-origin reads from a hostile page | No CORS origins unless allow-listed; same-origin proxy for the web app; `frame-ancestors 'none'` | `tests/integration/test_http_hardening.py`, `web/e2e/security-headers.spec.ts` |
| **I**nformation disclosure | Unlabelled risk figures mistaken for a diagnosis | Estimate envelope in the API and a visible label in the UI | `tests/integration/test_estimate_label.py`, `web/e2e/estimate-label.spec.ts` |
| **D**enial of service | Floods and oversized bodies | Per-token rate window, 1 MiB body cap, smaller caps on feeds | `tests/integration/test_http_hardening.py`, `test_lab_feed.py` |
| **E**levation of privilege | A person reaching counsellor or analyst data | Role-to-resource matrix, deny by default | `tests/integration/test_privacy.py` |
| **E**levation of privilege | A new route that skips consent | Every route must be classified and call the policy | `tests/integration/test_route_consent_inventory.py` |
| **E**levation of privilege | Injected script in the browser | CSP with `object-src 'none'` and no framing | `web/e2e/security-headers.spec.ts` |

## LINDDUN (privacy)

| | Threat | Control | Test |
| --- | --- | --- | --- |
| **L**inkability | Joining records across roles through ids | Salted, per-purpose references in the audit chain; aggregates only for the analyst | `tests/unit/test_consent_aggregates.py` |
| **I**dentifiability | Re-identifying a person from small cells | Small-cell suppression and a spending budget on aggregates | `tests/unit/test_consent_aggregates.py` |
| **N**on-repudiation (unwanted) | A person cannot show who read their data | Personal access trail listing each read | `tests/integration/test_api_privacy.py` |
| **D**etectability | Learning that a couple has a finding | Tier 3 results stay behind counsellor review; the couple view is hidden until both agree | `tests/integration/test_demo_path.py` |
| **D**isclosure across family members | A relative or partner seeing more than agreed | Scoped grants (summary, tier only, relationship only), revocable, projected per field | `tests/unit/test_consent_sharing.py` |
| **U**nawareness | A person not knowing what is shared | Consent text shown at grant time; sharing is off by default (preparation sheet, imports) | `tests/integration/test_prep.py` |
| **N**on-compliance | Directive or stigmatising wording | Banned phrases and non-stigma suites over code, templates and messages | `tests/unit/test_banned_phrases.py`, `test_nonstigma.py` |

## Known limits

- Scripts allow `'unsafe-inline'` because Next.js injects its bootstrap inline. A nonce-based policy needs dynamic rendering; see the note in `web/next.config.mjs`.
- The demo identity provider is not an authentication system. Real deployment needs one and a data-processing review.
- Native-speaker review of all non-English text is still pending (`docs/REVIEWS.md`).
- Observatory and securityheaders.com scores must be recorded against the live site after deploy; they are not claimed here.
