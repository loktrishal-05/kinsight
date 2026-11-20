# Submission form text

Draft text for the Hack2Skill form. Character counts are checked by `tests/unit/test_submission_text.py`. Before pasting, check every claim against the live site on the day.

## Solution summary (limit 2,000 characters)

<!-- summary:start -->
KinSight helps couples and families understand inherited disease risk linked to consanguinity, privately and in their own language. It turns a premarital or preconception carrier-screening result into plain words, shows what it means for a couple, prepares them for a genetic counsellor, and never tells anyone what to decide.

Every number comes from a deterministic, tested genetics engine: kinship from the family tree, carrier and couple risk from published formulas. The API cannot return a bare risk figure. Each one travels as an "educational estimate, not a diagnosis" with a link to how it was calculated, and the interface shows that label beside every figure in all seven languages.

Default-deny consent governs every read. Each route is classified and audited in a tamper-evident chain, and partners, relatives and counsellors see only what the person has shared. Complex and high-risk findings go to one counsellor review queue first; the person sees a calm waiting notice, not the result.

Since the early review we added what the judges asked for. Lab and EHR integration: a signed HL7 v2 and FHIR lab feed, FHIR R4 import and referral write-back against a seeded sandbox, and report reading from PDFs or photos, checked field by field by the person. A pre-counselling suite: a preparation sheet with tailored, neutral questions shared per section only by choice; a what-if scenario explorer; an editable family tree; live reference data from MedlinePlus, ClinGen and Ensembl; and an extended-family cascade tracker, where relatives receive a condition-only invite and never the sender's result.

Everything runs on synthetic data. Accessibility is checked against WCAG 2.2 AA on every page in English, Arabic and Hindi, and outcome measures track understanding and access to care. We deliberately do not measure marriages or pregnancy decisions.
<!-- summary:end -->

## What has been built (limit 1,500 characters)

<!-- built:start -->
Live: Next.js 16 web app (Vercel) and FastAPI service (Render) with Postgres. Seven languages including Arabic right-to-left.

Built and tested: deterministic genetics engine (kinship, carrier and couple risk, scenarios, relatives); educational-estimate envelope on every figure; default-deny consent with audited route inventory and hash-chained audit; unified counsellor review queue; signed HL7 v2 and FHIR lab feed; FHIR R4 import and referral write-back (HAPI sandbox); PDF and photo report reading with field review; editable family tree; live reference data with nightly ClinVar re-check; preparation sheet with per-section sharing; what-if scenarios; cascade tracker with condition-only invites; Kin assistant with deterministic tools (optional model mode, off by default); outcome metrics with small-cell suppression.

Quality: about 840 Python tests, 120 unit tests for the web app and Playwright tests across languages, phone and desktop; axe WCAG 2.2 AA with zero violations on 27 pages; CodeQL, gitleaks and dependency audits in CI.

Not yet: comprehension study results, expert clinical and language review, hosted FHIR and lab feed (runbooks ready), SMART launch.
<!-- built:end -->
