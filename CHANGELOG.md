# Changelog

## Unreleased

- Added an optional local model that selects Kin tools. Replies show their sources and use reviewed text or consent-checked data. The existing deterministic assistant remains the default.
- Added on-device OCR for lab-report photos and scanned PDFs. Each imported field must be reviewed before report comparison.

- Linting: ruff with the full rule set (bugbear, bandit, pyupgrade, naming, complexity), mypy --strict on genetics and consent, Biome lint with accessibility rules, knip, and `npm run check`; fixed the accessibility issues they found.
- Fixed a race: two requests at once could claim the same link in the hash-chained audit log, and the loser got 409. The API now retries a rolled-back transaction itself, and counsellor panels poll less often.
- Counsellor workspace: split pane with a sticky case header, keyboard triage (j/k, Enter, a, h, /, ?), filters kept in the URL, and a queue page that now reads in 7 SQL statements regardless of its length (was 29 for 24 cases).

- Added outcome measures for the analyst (results opened, understanding check, preparation, bookings, counsellor requests, cascade reach and testing, imports, overdue reviews) with small-cell suppression, an equity-gap alert and docs/METRICS.md. No marriage or pregnancy outcome is measured.
- Person home is now a dashboard: one calm next step and a card each for result, couple view (with its estimate label or the review waiting state), preparation, family testing, sharing and Kin.
- Accessibility: axe checks WCAG 2.2 A/AA on 27 pages in English, Arabic and Hindi on desktop and phone with zero violations; skip link, focus on navigation, live lab status, keyboard-only journey test, and docs/ACCESSIBILITY.md.

- CI: CodeQL (Python and TypeScript), gitleaks pinned by checksum, pip-audit that fails the build, coverage floors (92% genetics + consent, ratchet on web/lib) and Playwright reports on failure.
- Added the extended-family cascade tracker at /cascade (relatives from the family tree with a kinship-based estimate, private invites, anonymous notices, told-in-person, and self-reported outcomes) and a relative-facing /invite page.

- Added the unified counsellor review queue: one item per thing a counsellor must see first (couple result, imports, lab reports, requests to talk, reclassifications), audited decisions, and a calm waiting state for the person.

- Added security headers (CSP, HSTS, Permissions-Policy, COOP/CORP), an API CORS allow-list and body cap, and docs/THREAT_MODEL.md.

- Added the what-if scenario explorer at /plan/scenarios: chance per pregnancy, at least one of N, untested partner by relationship, and neutral descriptions of each route, all from the existing engine formulas.

- Added the pre-counselling preparation sheet at /prepare: reviewed neutral question bank (English and Arabic), editable questions, printable sheet and per-section sharing with the counsellor, off by default.

- Every risk figure now travels as an educational-estimate envelope in the API and renders with a visible label and a method link in all seven languages; schema and crawl guard tests keep it that way.

- Added local PDF and structured-text report comparison with reviewed fields and guided questions.
- Added signed synthetic HL7 v2 and FHIR lab delivery, live tracker updates and revision-specific counsellor approval.
- Added reproducible HAPI FHIR fixtures, account-scoped preview, confirmed imports, revocable review and stale release protection.
- Fixed the deployed audit tamper example and verified its broken entry.
- Aligned shipped languages and expanded the assistant's adversarial regression suite.
- Added contributor guidance and private security reporting.
