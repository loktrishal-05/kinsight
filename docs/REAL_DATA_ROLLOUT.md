# KinSight real-data rollout

## Decision

The early-review feedback calls for a working laboratory feed, EHR/FHIR integration, and report parsing for synthetic cases. KinSight currently has fictional personas, hard-coded case and couple aliases in the API client, and an API that labels its results synthetic. `NEXT_PUBLIC_MOCK=0` changes the transport to HTTP. A learning model cannot establish identity, retrieve a lab report, or determine which revision a clinician approved. [Judge feedback and tracking issue](https://github.com/loktrishal-05/kinsight/issues/65)

The opt-in lab sandbox demonstrates signed HL7 v2 and FHIR report intake, tracker updates, consent and approval, and correction handling in the app. The FHIR seed tool loads reproducible transactions into a local HAPI server. The independently hosted integrations and broader document parsing remain open. Follow the [continuation plan](CONTINUATION_PLAN.md) for the next work. [FHIR sandbox](https://github.com/loktrishal-05/kinsight/issues/32) · [FHIR import](https://github.com/loktrishal-05/kinsight/issues/28) · [Lab feed](https://github.com/loktrishal-05/kinsight/issues/30) · [Report parsing](https://github.com/loktrishal-05/kinsight/issues/31)

Start with one clinic, one lab, one supported panel and one reviewed language. The first pilot should display clinician-released reports and a clinician-reviewed couple summary after both partners consent. Treat missing coverage, ambiguous findings and an unavailable partner report as distinct states. ACMG and ACOG describe residual risk after a screen with no detected finding. Preserve that distinction and avoid producing a numerical estimate unless the clinical team validates the panel, inputs and calculation for the intended use. [ACMG carrier-screening practice resource](https://www.nature.com/articles/s41436-021-01203-z) · [ACOG carrier screening](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/03/carrier-screening-in-the-age-of-genomic-medicine)

## Findings and order of work

| Priority | Evidence in this repository | Work |
| --- | --- | --- |
| P0 | `/signin` accepted arbitrary credentials. Demo token issuance had an enable flag, while token verification did not. | Replace the credential form with explicit demo entry and reject existing demo tokens when the flag is off. |
| P0 | The client uses `demo-case`, `demo-couple` and a second fictional persona token. The API schema requires synthetic results. | Build pilot authentication and account-scoped APIs. Map the validated issuer and subject to the clinic’s patient identifier. Use server-side membership for case lookup and check both partners’ consent per shared read. [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html#ClaimStability) · [OAuth security best current practice](https://www.rfc-editor.org/rfc/rfc9700.html) |
| P0 | The signed sandbox feed updates the tracker from a separate mock lab process. The existing referral export is synthetic. | Agree on a provider contract and approved test reports. Map provider report identity, subject, findings, timestamps, and correction or withdrawal states. [HL7 Genomics Reporting](https://hl7.org/fhir/uv/genomics-reporting/general.html) |
| P0 | The API client rendered failed couple-assessment responses as waiting for consent. | Fixed the transport distinction and preserved redacted findings. The existing API keeps a generic access denial as a privacy boundary. Add explicit report and consent states for verified pilot members. |
| P0 | Demo output and rule files use a fictional panel and assumptions. | Start with a clinician release decision per report revision and per couple summary. Revoke stale release on correction or withdrawal. Keep the demo arithmetic out of pilot assessments until independently validated. |
| P0 | The web dependency audit flagged critical Next.js advisories and vulnerable Zod, PostCSS and Playwright versions. | Upgraded the dependencies in the working tree. The production audit reports zero vulnerabilities after the upgrade. Keep dependency review and browser checks in the pilot release process. [Next.js advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw) · [Web licence inventory](LICENSES.md) |
| P1 | Public ClinVar and gnomAD lookup is reference enrichment. | Use approved, versioned references only when the clinical workflow requires them. ClinVar aggregates submissions and can represent conflicting classifications. It supplies no evidence that an individual was tested. [NCBI ClinVar classifications](https://www.ncbi.nlm.nih.gov/clinvar/docs/clinsig/) |
| P1 | The volunteer study tooling exists. Clinical and language review are pending. | Agree on intended use, jurisdiction, permitted data flows, retention and a named clinical owner. Run comprehension and safety reviews with the host before release. [WHO human genome data governance](https://www.who.int/publications/i/item/9789240102149) · [Existing pilot readiness checklist](PILOT_READINESS.md) |

## Schedule and acceptance gates

The first row is complete in this working tree. The remaining windows are engineering estimates. The staging clock starts when the host supplies test credentials, a sandbox feed and approved report examples. Approval and partner lead time are outside the estimates.

| Window | Deliverable | Acceptance |
| --- | --- | --- |
| Start here | Demo boundary fixes and synthetic report-revision contract. | Demo entry collects no credentials. Disabling demo authentication stops issued demo tokens. Synthetic pending, approved, amended and withdrawn revisions are exercised. |
| Staging week 1 | Clinic identity, account-to-patient mapping and provider-specific report mapping. | Two partner accounts and an unrelated account authenticate independently. Unknown and mismatched patient references fail closed. |
| Staging week 2 | Persist and reconcile lab reports. Wire the personal result view to the latest clinician-released revision and display source and update time. | Pending, missing, partial, corrected, withdrawn, duplicate and out-of-order inputs work end to end. Never show the older approved result after a newer revision arrives. Track source delay and show freshness or unavailability. Start with refresh on open and explicit refresh. Add push or polling when the lab agrees on update latency. |
| Staging week 3 | Pairing, separate partner consent, clinician-reviewed couple summary and audit. | Either partner can revoke immediately. An unrelated account cannot read the case. Corrections invalidate the couple summary and alert its reviewer. Staging demonstrates both accounts seeing a corrected release. |
| Pilot gate | Clinic acceptance, privacy and jurisdiction review, security and recovery checks, reviewed wording and supervised release. | Host signs off. Run a correction drill, test access and retention controls, validate result fidelity against the lab, and agree on response times and stop criteria. |

## Training decision

No model is required for the first pilot. Use the lab’s structured interpretations and clinician-approved wording. A later model experiment needs a concrete task, such as drafting explanations from approved facts, and a measured improvement over templates. Evaluate factual fidelity, omissions, unsupported claims, escalation and comprehension by language on a held-out clinician-reviewed set. Use public or synthetic examples for Colab or Kaggle experiments. Keep identifiable lab reports in the host’s approved environment.

## Run the first integration check

From the repository root, run `python -m pytest -q tests/integration/test_pilot_reports.py tests/unit/test_consent_auth.py`. The report contract in `services/api/pilot_reports.py` is an executable synthetic integration slice. It models one report stream, assumes the source supplies a monotonic revision, and matches approval to the latest subject, report and revision. Production source ordering, persistence, release authorization and web integration depend on the agreed host contract.

`from_synthetic_fhir` accepts a synthetic-tagged `DiagnosticReport` with the expected relative patient reference, report status and issued timestamp. The caller supplies a numeric revision from the feed contract and separately mapped lab interpretations. Select the revision from the ordered source feed because FHIR `meta.versionId` can be opaque. The mapping is exercised with final and corrected reports. Public HL7 examples are useful for structural checks and Synthea can supply broader synthetic encounter scenarios. [FHIR R4 DiagnosticReport](https://hl7.org/fhir/R4/diagnosticreport.html) · [FHIR resource metadata](https://hl7.org/fhir/R4/resource.html#Meta) · [Synthea](https://synthetichealth.github.io/synthea/)

The live ClinVar and gnomAD adapters returned data for the public demo variant IDs on 2026-11-18. Their upstream error envelopes now fail as unavailable instead of producing an empty lookup. The [data source inventory](../DATA_SOURCES.md) documents their role and provenance.

## Run the lab sandbox

Start the API with the normal local demo settings, `KINSIGHT_DEMO=1`, `KINSIGHT_DEMO_AUTH=1` and `KINSIGHT_LAB_SANDBOX=1`. Start the web app with `NEXT_PUBLIC_MOCK=0`, `NEXT_PUBLIC_LAB_SANDBOX=1`, and `KINSIGHT_API_URL` pointing to that API. Open **Lab report sandbox** from Home.

1. As Person A, select **Share for review**. The grant expires after one hour and can be revoked from Consents.
2. As the demo operator, send revision 1 for Person A. The intake posts a bounded synthetic FHIR `DiagnosticReport` and two labelled sample findings.
3. As the counsellor, open Person A’s report and approve the revision. Person A’s open page checks for updates every five seconds. Person B can see only their own report.
4. Send revision 2 as a correction. Person A sees a pending state until the counsellor approves revision 2.

Use a fresh local database for the browser test. The sandbox routes are off by default. The intake accepts two fixed synthetic participants, two fictional condition identifiers, and a narrow report shape. Approvals and revisions persist in the database.

To exercise deliveries from a separate process, set `KINSIGHT_LAB_SIGNING_SECRET` on the API and in the mock lab shell. Use a secret of at least 32 bytes that differs from the token secret and audit salt. Start the API, open **Journey** as Person A, and run the following commands from the repo root.

```sh
python -m scripts.mock_lab --api http://127.0.0.1:8000 --format hl7
python -m scripts.mock_lab --api http://127.0.0.1:8000 --format hl7 --start-stage 8 --revision 2
```

Journey polls every five seconds. The first command sends collection through quality review before submitting the initial result. Complete steps 1 and 3 above before running the second command to see the correction return to review. Signed mode disables the demo operator's direct intake and manual tracker advancement. The API checks HMAC-SHA256 over the request method, path, timestamp, delivery ID and raw body. Authentication failures produce content-free server log entries. The audit chain records successful deliveries and rejected authenticated events. [RFC 2104](https://www.rfc-editor.org/info/rfc2104/)

- `POST /api/integrations/lab/hl7` accepts the documented synthetic HL7 v2.5.1 profile. `ORM^O01` updates the tracker using the lab's `ZKS` stage. `ORU^R01` maps its `OBR` status and coded `OBX` findings. For results, `ZKS` carries the numeric report revision. The synthetic fixtures show the exact IDs, separators and field codes. [Fixtures](../tests/fixtures/hl7/) · [HL7 result mapping](https://www.hl7.org/fhir/uv/v2mappings/ConceptMap-message-oru-r01-to-bundle.html)
- `POST /api/integrations/lab/events` continues accepting JSON stage and report envelopes. An envelope with `kind: "bundle"`, `subject_id`, `revision`, and `bundle` accepts a FHIR collection containing one tagged synthetic DiagnosticReport and its referenced tagged Observations. The report uses the existing sandbox report code. Each Observation uses the local synthetic condition coding system and a supported LOINC assessment answer. Every resource must match the assigned participant. [FHIR R4 DiagnosticReport](https://hl7.org/fhir/R4/diagnosticreport.html)

This profile is for the two KinSight demo participants. Hosted lab credentials, provider-specific fields and hosted acceptance remain open.

### Hosted signed lab feed checklist

Use the following settings on an isolated synthetic deployment before enabling the demo. The lab sender talks directly to Render over HTTPS. The Vercel browser polls through its existing API rewrite and never holds the signing key.

On 2026-11-20 IST, the hosted synthetic lab feed advanced Person A from stage 1 to stage 8 through signed HL7 deliveries. Person B stayed at stage 1. The service rejected an unsigned delivery and a replay. A browser check on the public Journey page showed stage 8, and the result remained pending for review. The Lab report sandbox navigation flag was saved for the next Vercel production build.

| Where | Variable | Value |
| --- | --- | --- |
| Render API `kinsight-api-va` | `KINSIGHT_DEMO`, `KINSIGHT_DEMO_AUTH`, `KINSIGHT_LAB_SANDBOX` | `1` on the synthetic demo |
| Render API and mock-lab process | `KINSIGHT_LAB_SIGNING_SECRET` | Same secret of at least 32 bytes, distinct from the token secret and audit salt |
| Vercel web project `kinsight` | `KINSIGHT_API_URL` | Render service origin, without `/api` |
| Vercel web project `kinsight` | `NEXT_PUBLIC_MOCK`, `NEXT_PUBLIC_LAB_SANDBOX` | `0` and `1`, respectively |

- [ ] Check that the test database and tracker are isolated from other users. Start with the fictional Person A tracker at stage 1 so the strict sequence can accept stage 2. For a repeat run, use a fresh demo database or an unused synthetic subject. Keep the signing secret in Render and the sender's secret store. [Render environment settings](https://render.com/docs/configure-environment-variables)
- [ ] Deploy the API and check Render OpenAPI for `POST /api/integrations/lab/hl7` and `POST /api/integrations/lab/events`. Both routes require signed mode. Rebuild Vercel with the listed public flag and confirm `/api/health` through the rewrite. [Vercel environments](https://vercel.com/docs/environment-variables)
- [ ] Open **Journey** as Person A. In the sender shell, with the signing secret loaded without printing it, run the following command. Watch the tracker advance as the messages arrive. The delay allows the five-second polling view to show each stage.

  ```sh
  python -m scripts.mock_lab --api "$RENDER_API_URL" --format hl7 --subject synthetic-a --delay 6
  ```

- [ ] From **Lab report sandbox**, verify intake did not release the findings. Share for review as Person A, approve the current revision as the demo counsellor, and verify that Person B’s tracker and results are unchanged.
- [ ] Submit revision 2 using the same command with `--start-stage 8 --revision 2`. Check that the corrected report waits for review and the old findings are withheld. Record timestamps, revisions and outcomes without storing report content or signatures.
- [ ] Run `python -m pytest -q tests/unit/test_hl7_lab.py tests/integration/test_lab_feed.py` for malformed inputs, unsigned requests, duplicate delivery IDs, subject validation and FHIR bundle intake. Use the documented fixture profile before testing a different sending system.
- [ ] To roll back, stop the sender, set `NEXT_PUBLIC_LAB_SANDBOX=0` and rebuild Vercel, then set `KINSIGHT_LAB_SANDBOX=0` and redeploy Render. Disabling the sandbox flag closes both intake modes.

## Seed the FHIR R4 sandbox

Install the development dependencies with `pip install -e ".[dev]"`. Start the loopback-only HAPI server with `docker compose up -d fhir`. Once `http://127.0.0.1:8088/fhir/metadata` responds, run `make fhir-seed`. On a machine without Make, run `python -m scripts.export_fhir_bundles --upload http://127.0.0.1:8088/fhir`. Set `FHIR_URL` when invoking Make to select another disposable sandbox.

The exporter uses two couples from the reproducible cohort. Each person has a separate Patient, partner relationship, draft privacy Consent, report and set of Observations. Every resource carries the synthetic tag. Observations use the Genomics Reporting guide's LOINC assessment code and a fixture-specific component for the fictional target. The cohort has no real gene, HGVS, or allele data. Python checks resource shape with the Pydantic-compatible R4B models in `fhir.resources`. The HAPI round-trip checks R4 delivery and queries. [FHIR R4 transactions](https://hl7.org/fhir/R4/http.html#transaction) · [Genomics Reporting Variant profile](https://hl7.org/fhir/uv/genomics-reporting/StructureDefinition-variant.html) · [fhir.resources versions](https://pypi.org/project/fhir.resources/)

Use `python -m scripts.export_fhir_bundles --out tmp/fhir-seed` for offline JSON. To test an update, append `--correction` to the upload command. The server's version preconditions apply the update to the seeded report and its changed Observation in one transaction. Re-seeding restores the initial reports. Set `KINSIGHT_FHIR_TEST_URL` to the disposable endpoint and run `python -m pytest tests/integration/test_fhir_seed.py -q` to check matching and unrelated subject searches and verify the report's version changes. The local server allows unauthenticated access. App-side identity mapping and patient authorization belong to the SMART import work.

### Preview the assigned synthetic health record

Set `KINSIGHT_FHIR_SANDBOX_URL=http://127.0.0.1:8088/fhir` on the demo API and `NEXT_PUBLIC_FHIR_SANDBOX=1` on the HTTP-backed web build. For Compose, use `http://fhir:8080/fhir` inside the API container and set `NEXT_PUBLIC_MOCK=0` in `.env` before rebuilding.

1. As Person A, open **My result** and select **Load latest report** under **Health record preview**. The server maps the demo account to its own fixture. The preview shows the issued time and observation IDs. Uncertain findings wait for review, and an unrecognized target suppresses the finding list.
2. Select **Save and share this version with the demo counsellor for one hour**. A confirmed copy survives an API restart. The owner can revoke the grant from **Consents**.
3. As the demo counsellor, open **Review a synthetic health record**, choose Person A and select **Open shared report**. A mapped report can be approved. An unmapped report stays in review. A participant's saved findings appear after approval.
4. Send the seed correction. The app withholds the old result once it detects the change and requires confirmation and review for the new copy. Source checks cover the report version and its linked findings. If the source is unavailable, the app withholds the saved findings until it can verify them again.

The confirmed synthetic import is separate from the illustrative couple assessment. SMART authorization, approved patient identity mapping and hosted acceptance remain part of [#28](https://github.com/loktrishal-05/kinsight/issues/28). [SMART App Launch](https://hl7.org/fhir/smart-app-launch/app-launch.html)

### Hosted FHIR R4 rollout checklist

This checklist prepares the fictional HAPI path for the hosted demo. An operator with deployment access applies the settings and records the checks. Both the FHIR source and application database must contain only synthetic demo data.

| Where | Variable | Value |
| --- | --- | --- |
| Render API `kinsight-api-va` | `KINSIGHT_DEMO`, `KINSIGHT_DEMO_AUTH` | `1` on the synthetic demo |
| Render API `kinsight-api-va` | `KINSIGHT_FHIR_SANDBOX_URL` | HTTPS base for a dedicated HAPI R4 sandbox, for example `https://<sandbox-host>/fhir` |
| Vercel web project `kinsight` | `KINSIGHT_API_URL` | Render service origin, without `/api` |
| Vercel web project `kinsight` | `NEXT_PUBLIC_MOCK`, `NEXT_PUBLIC_FHIR_SANDBOX` | `0` and `1`, respectively |

- [ ] Choose a disposable HAPI R4 server reachable from Render. Verify `<FHIR base>/metadata` reports FHIR R4. Use `python -m scripts.export_fhir_bundles --upload "$FHIR_URL"` from the repository root to load the fictional fixtures. Keep this write target separate from any EHR or clinic system.
- [ ] Verify the existing Render database, token secret and audit salt are configured. Use the Render service's Environment page to stage only the listed values, then deploy the API. Keep the existing database connection and signing settings in Render. [Render environment settings](https://render.com/docs/configure-environment-variables)
- [ ] Deploy a Vercel build with the listed variables in the intended environment. Public flags and the API rewrite are read when building the web app. Keep the sandbox flag disabled in previews that point to a shared production API. [Vercel environments](https://vercel.com/docs/environment-variables)
- [ ] Compare `/api/health` on Render and Vercel. Check that the hosted Render OpenAPI includes `POST /api/me/imports/fhir`. A missing route points to an older API build or an unset FHIR base. A report marked unavailable points to the source connection or fixture response.
- [ ] On the hosted site, sign in as the two fictional people in separate browser profiles. Check that each person sees only the assigned fixture. Confirm Person A’s report and check that its findings wait for counsellor approval. Check approval for the current revision and verify Person B cannot see Person A’s import.
- [ ] Send a correction to the disposable HAPI sandbox with `python -m scripts.export_fhir_bundles --upload "$FHIR_URL" --correction`. Verify stale findings disappear and require renewed review. Restore the initial fixture. Record the web/API revisions, result and time without including report content or credentials.
- [ ] If the hosted check fails, rebuild with `NEXT_PUBLIC_FHIR_SANDBOX=0` to hide the entry point. Remove `KINSIGHT_FHIR_SANDBOX_URL` from the Render demo service and redeploy to disable the API routes.

The current HAPI import uses fixed synthetic account bindings. SMART requires a separate client registration, trusted issuer discovery, a registered redirect URI and an authorization-code flow with PKCE. The current build exposes no SMART settings that an operator can enable. Track SMART launch and the hosted acceptance result on the issue. [HL7 SMART App Launch](https://hl7.org/fhir/smart-app-launch/) · [Issue #28](https://github.com/loktrishal-05/kinsight/issues/28)

### Send a synthetic referral to HAPI

Set `KINSIGHT_FHIR_REFERRAL_URL` to a private disposable HAPI R4 base on the demo API and `NEXT_PUBLIC_FHIR_REFERRAL=1` on the HTTP-backed web build. Person A opens their result and explicitly allows the sandbox referral. After release and teach-back, the assigned counsellor records a requested service stage and selects **Approve and send sandbox referral**. KinSight creates a ServiceRequest and Task in one transaction. Retries use conditional creates with the same identifiers.

The console displays both FHIR IDs and the last sync time. It checks the Task every ten seconds while the console is open and can check again on demand. HAPI's Task must be completed before this path records the corresponding stage with the Task ID as evidence. Revoking delivery consent stops future sends and checks. The demo case resets with the existing demo workflow. [FHIR ServiceRequest](https://hl7.org/fhir/R4/servicerequest.html) · [FHIR Task](https://hl7.org/fhir/R4/task.html)

## Compare existing lab reports

The public `/report-compare` page accepts PDF, PNG, JPEG, TSV and TXT through a picker or drag and drop. It reads files locally. Structured text and the verified Labcorp negative SMA and Fragile X carrier-screen summaries can supply suggested findings. Other layouts show a preview for manual entry. For attached reports, the review shows an extracted snippet where available. Each gene, condition, reported result, and optional details field must be checked before comparison. Editing the text clears the confirmations for that report. Use only the findings and avoid copying identifiers. The page accepts up to 1,000 findings per report and preserves multiple findings for a gene and condition. [Labcorp examples](https://www.labcorp.com/womens-health/providers/resources/sample-reports)

Photos and PDFs without selectable text use browser-local Tesseract OCR in English, or Arabic and English when the interface is in Arabic. Photo files are limited to 10 MB, 16 megapixels and 8,192 pixels on either side. Scanned PDFs are limited to six pages. The browser downloads the OCR worker and trained data from KinSight and processes the selected report in memory. PDF text order can differ from the visual table. Locked PDFs and image-only sections in otherwise selectable PDFs can require manual transcription. [Tesseract.js local installation](https://github.com/naptha/tesseract.js/blob/v7.0.0/docs/local-installation.md)

This tool aligns explicitly entered rows by the same gene set and condition label. It distinguishes a missing entry from a reported finding and leaves the labs’ wording intact. The chart filters the entered rows by which report contains them. The guided questions explain exact report terms, differences in panel coverage, and questions to bring to a counsellor. The downloaded public index provides local MedlinePlus links. The comparison supplies no independent patient result or reproductive risk estimate. [ACMG carrier screening practice resource](https://pmc.ncbi.nlm.nih.gov/articles/PMC8488021/) · [MedlinePlus result terminology](https://medlineplus.gov/genetics/understanding/testing/interpretingresults/) · [Data source inventory](../DATA_SOURCES.md)

Run `python scripts/update_report_references.py` from the repository root to refresh the public gene and condition link index. It downloads the source catalogue and writes URL slugs only. The comparison operates in memory and does not send report files or text to the API. A browser test covers PDF reading, preserved findings, validation, and clearing inputs. Authenticated clinical intake, lab-specific document validation, patient identity checks, and audited clinical review remain required for a hosted clinical workflow.

## Remaining integration work

| Order | Scope | Acceptance check |
| --- | --- | --- |
| 1 | Register a SMART client and seed an approved hosted synthetic FHIR sandbox. Connect Genomics Reporting fields to a reviewed panel mapping. | Each signed-in sandbox account resolves only its assigned report. The reviewed result flows through the deterministic engine. [Issue 28](https://github.com/loktrishal-05/kinsight/issues/28) |
| 2 | Connect the signed synthetic lab feed to the hosted demo. | Hosted lab events arrive in order and respect person scope, consent, revision review and replay protection. [Issue 30](https://github.com/loktrishal-05/kinsight/issues/30) |
| 3 | Extend automated extraction to more report layouts. | Synthetic fixtures cover varied layouts, Arabic and ambiguous findings through human review. [Issue 31](https://github.com/loktrishal-05/kinsight/issues/31) |
| 4 | Extend Kin's explicit scenario and prep actions with a grounded optional model. | Tool calls are traceable, audited and checked against multi-turn red-team prompts. [Issue 35](https://github.com/loktrishal-05/kinsight/issues/35) |
| 5 | Add the remaining reference sources and a scheduled reclassification review. | New facts carry provenance and a recorded ClinVar change opens a counsellor task. [Issue 33](https://github.com/loktrishal-05/kinsight/issues/33) |

For development, use the local HAPI fixture tools and public reference skills. [Agent tooling](AGENT_TOOLING.md)
