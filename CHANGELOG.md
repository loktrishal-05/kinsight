# Changelog

## Unreleased

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
