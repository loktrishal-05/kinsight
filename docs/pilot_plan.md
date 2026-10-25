# One-page pilot plan (draft)

**Goal.** Test whether plain-language, consent-first result explanation plus triage shortens time to counselling and improves understanding across languages and literacy levels, in one premarital or preconception screening service.

**Buyer map.** Health authority genetics or public-health programme (sponsor); the screening service lead (host); clinical genetics and counselling teams (users); data protection / ethics officer (gatekeeper). Procurement path to confirm after registration.

**Integration path.** (1) Receive screening results as a minimal structured feed (person alias, condition id, status) from the lab or LIS via an agreed interface (FHIR-style export is a later option). (2) Counsellor queue inside the service's existing referral process. (3) Identity from the service's own system; KinSight stores aliases only.

**Data-access needs.** Aliased results and relationship edges entered or consented by the users; no national IDs, names, dates of birth or locations. In-region hosting and an approved model endpoint if any model is used; Mode A needs none.

**Scalability.** Containerised services, config-driven panel and languages, stateless API with a Postgres checkpointer. Capacity simulator (`configs/capacity.yaml`) sizes counsellor needs; results are illustrative until local arrival data exists.

**Measures.** Understanding (quiz pass rate by language and reading level, gap vs a 10-point target), counselling uptake, time from result to counsellor contact and to confirmatory assessment, privacy incidents (target zero), consent revocation latency. Cancelled marriages are not a success measure.

**Risks.** Wording read as steering (mitigation: template-only text, banned-phrase checks, counsellor gate); unreviewed Arabic; consent flow complexity; clinical validation of formulas; dependence on lab data quality. Evidence to date is simulation plus a small fictional-case study if run.
