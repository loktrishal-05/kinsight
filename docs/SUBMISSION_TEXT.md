# Submission form text

Draft text for the Hack2Skill form. Character counts are checked by `tests/unit/test_submission_text.py`. Before pasting, check every claim against the live site on the day.

## Solution summary (limit 2,000 characters)

<!-- summary:start -->
KinSight helps couples and families understand inherited disease risk linked to consanguinity, privately and in their own language. It turns a premarital or preconception carrier-screening result into plain words, shows what it means for a couple, prepares them for a genetic counsellor, and never tells anyone what to decide.

Educational risk figures come from a deterministic, tested genetics engine. The interface shows the estimate label and links to the calculation method.

Default-deny consent governs every read. Each route is classified and audited in a tamper-evident chain, and partners, relatives and counsellors see only what the person has shared. Complex and high-risk findings go to one counsellor review queue first; the person sees a calm waiting notice, not the result.

Since the early review we added what the judges asked for. Lab and EHR integration: a signed HL7 v2 and FHIR lab feed, FHIR R4 import and referral write-back against a seeded sandbox, and browser-local report reading with field review. A pre-counselling suite: a preparation sheet with tailored, neutral questions shared per section only by choice; a what-if scenario explorer; an editable family tree; live reference data from MedlinePlus, ClinGen and Ensembl; and an extended-family cascade tracker, where relatives receive a condition-only invite and never the sender's result.

Everything runs on synthetic data. Automated accessibility checks cover selected routes in English, Arabic and Hindi. Outcome dashboards show demo measures. The next step is testing comprehension and follow-up with people under an approved protocol.
<!-- summary:end -->

## What has been built (limit 1,500 characters)

<!-- built:start -->
Live: Next.js 16 web app (Vercel) and FastAPI service (Render) with Postgres. Seven languages including Arabic right-to-left.

Built and tested: deterministic genetics estimates, consent and audit, unified counsellor review, signed HL7 v2 and FHIR lab feed, FHIR R4 import and referral write-back (HAPI sandbox), browser-local PDF and photo review, family tree, reference lookup, preparation sheet, scenarios, cascade invitations, and outcome metrics with small-cell suppression. Kin uses deterministic tools by default. A bilingual family-planning guide links to official services.

Evidence: hosted synthetic HAPI import and signed HL7 walkthroughs, Playwright on phone and desktop, automated axe checks on selected routes, and CI security and dependency checks.

Pending: human comprehension evidence, clinical and native-language review, SMART launch and provider onboarding.
<!-- built:end -->
