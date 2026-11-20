# One-page pilot plan (draft)

**Goal.** Test whether plain-language, consent-first result explanation plus triage shortens time to counselling and improves understanding across languages and literacy levels, in one premarital or preconception screening service.

**Buyer map.** Health authority genetics or public-health programme (sponsor); the screening service lead (host); clinical genetics and counselling teams (users); data protection / ethics officer (gatekeeper). Procurement path to confirm after registration.

**Integration path.** (1) Receive screening results as a minimal structured feed (person alias, condition id, status) from the lab or LIS via an agreed interface (FHIR-style export is a later option). (2) Counsellor queue inside the service's existing referral process. (3) Identity from the service's own system; KinSight stores aliases only.

**Data-access needs.** Aliased results and relationship edges entered or consented by the users; no national IDs, names, dates of birth or locations. In-region hosting and an approved model endpoint if any model is used; Mode A needs none.

**Scalability.** Containerised services, config-driven panel and languages, stateless API with a Postgres checkpointer. Capacity simulator (`configs/capacity.yaml`) sizes counsellor needs; results are illustrative until local arrival data exists.

**Measures.** Understanding (quiz pass rate by language and reading level, gap vs a 10-point target), counselling uptake, time from result to counsellor contact and to confirmatory assessment, privacy incidents (target zero), consent revocation latency. Cancelled marriages are not a success measure.

**Risks.** Wording read as steering (mitigation: template-only text, banned-phrase checks, counsellor gate); unreviewed Arabic; consent flow complexity; clinical validation of formulas; dependence on lab data quality. Evidence to date is simulation plus a small fictional-case study if run.

## Partner onboarding and acceptance

Use this checklist with one Abu Dhabi screening service and its laboratory. Record the named owner, evidence, date and decision for each item in the partner's approved workspace. All decisions are pending. Keep credentials, records, and participant exports out of GitHub.

| Owner | Evidence needed before the next stage |
| --- | --- |
| Screening service lead | Accept the proposed scope, accountable clinician, one panel, one source and one referral pathway. Agree who responds to a held result, an unreachable participant or a failed referral. |
| Clinical and native-language reviewers | Record the reviewed content revision and sign-off scope. Check one clear, incomplete, uncertain and amended fictional report. Review Arabic and English family-planning content, test limitations, prep questions and referral instructions. [Reviewer pack](REVIEW_PACK.md) |
| Study supervisor | Record the ethics determination, reviewed consent and comparator materials, recruitment scope, and approved storage and deletion dates. Run a facilitator dry run before recruiting. [Study protocol](study/protocol.md) |
| Provider privacy and security leads | Approve identity binding, data flow, role scopes, processing locations, vendor handling, retention and incident response before any real records enter KinSight. Identify the applicable Abu Dhabi research and data approvals with the provider. [DoH research and ethics guidance](https://www.doh.gov.ae/en/research/landing-page) |
| Lab and EHR leads | Supply the approved synthetic test IDs, source and panel versions, code map, expected report revisions and referral status. For a supported SMART launch, register the client and callback, approve scopes and test patient context with PKCE. Use the provider's approved exchange. [SMART App Launch](https://hl7.org/fhir/smart-app-launch/) |
| Operations and clinical lead | Record results for correct-person release, wrong-person denial, duplicate events, stale and corrected reports, consent revocation, source outage and recovery. Demonstrate referral receipt and return status. Stop the pilot for a wrong-person release, an unverified complex release, or a confirmed privacy incident. |

Run synthetic shadow acceptance first. Compare the provider's recorded source revision, KinSight's review state and the next action. The public demo uses fictional fixtures. Move to supervised real-record use only after the provider documents approval for the reviewed scope. [Evaluator roadmap](EVALUATOR_ROADMAP.md) · [Synthetic rollout](REAL_DATA_ROLLOUT.md)
