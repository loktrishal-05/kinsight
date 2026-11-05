# Silah-Genomics master PRD vs KinSight: final status

Source: `silah_genomics_complete_master_prd.pdf` (research monograph, 64-section blueprint, FR-001..030, NFR-001..018, OOB-1..10,
P-01..P-18, 30 judge questions). KinSight already covered the challenge's six mandates as a synthetic demo; this file records what the
PRD added and where each item stands now.

**Legend.** **Done**: built, wired to the API and screens, tested. **Simulated**: built against synthetic data with the real rule or
maths, but the real external system is not connected. **External**: needs a real system, licence or approval; not built. **Not done**:
a gap that remains.

KinSight is a fictional demo. Nothing in this table is a claim of clinical validity.

## Core features

| PRD | Item | Status |
|---|---|---|
| CF-1 / FR-001..004 | Bilateral consent, 9-digit PIN pairing (15 min, 3 per 30 days), one-tap revoke, audit | **Done** (`/journey`, `services/lifecycle/pairing.py`). UAE Pass biometric login: **External**; demo personas are used |
| CF-2 / FR-006,007 | Zero-leakage compatibility | **Simulated**: an unaudited commutative-encryption PSI demo (`consent/psi_demo.py`, flag off) and shared-gene intersection only; compound heterozygotes detected (`triage` RULE-05). Lab-signed APSI/SMPC in an enclave: **External** |
| CF-2 / FR-008 | Kinship, consanguinity-adjusted residual risk | **Done** (`genetics/`). Homomorphic KING estimator: **External** |
| CF-3 / FR-009,010 | Plain-language explainer, 100-icon array, twin view | **Done**. Physically separate individual and couple vaults: **Not done** (separation is by consent policy and field projection, not by schema) |
| CF-4 / FR-012 | Teach-back | **Done** (5 questions, gentle re-explanation, counsellor offer); the certificate card is **locked until the check is passed** (`/journey`) |
| CF-4 / FR-013,014 | Values clarification, options | Options explorer and values questions **Done**. RGCS-DA item wording and Fiqh / Awqaf guidance text: **External** (licensed items and reviewed religious text); only the calendar facts are built (`/plan`, gestational clock, 10-12 week window, day 120) |
| CF-5 / FR-015 | Deterministic escalation rules | **Done** (`lifecycle/triage.py`, `/clinic`): orthogonal hold, multi-gene risk, compound heterozygote, private findings as counts, pregnancy window, decisional support |
| CF-5 / FR-016,017 | Priority booking, pre-consult brief | **Done** (`/plan` booking within the SLA, stored; brief in the counsellor console) |
| CF-6 / FR-018,019 | Confirmatory orders, closed-loop referral | Referral state machine with evidence-to-close and 72 h stall check **Done**. Real FHIR ServiceRequest to labs and Al Amal: **External** |
| CF-6 / FR-020 | TAMM attendance-only webhook | **Simulated** (`/clinic` completion notice, fixed key allow-list, no genetic fields). Real TAMM endpoint: **External** |
| CF-6 / FR-021 | 24 h single-use family token | **Done** (signed token, stored nonce; HMAC instead of the PRD's AES-CBC) |
| FR-024 | MMIC, DCS, GCOS-24 metrics | **Done** (scoring in `lifecycle/measures.py` and `safety.py`, `/plan` and `/checkin`). No marriage-cancellation metric exists anywhere. Item wording is not reproduced (licensed) |
| FR-025 | Equity dashboard, gap alert at 10 points | **Done** (analyst dashboard, small cells suppressed, gap alert tested at the threshold) |
| FR-026 | Malaffi sealed publishing | **External** (a FHIR export function exists, with no route on purpose) |
| FR-027 | Citizen audit timeline | **Done** (hash-chained audit, `/access`) |
| FR-030 | Break-glass | **Simulated** (`/clinic`, dual attestation, audit; no real SIEM) |

## Secondary and future

| PRD | Item | Status |
|---|---|---|
| SF-1 / FR-023 | Waiting-period check-in (PAGIS flag) | **Done** (`/checkin`); item wording from the licensed form |
| SF-2 / FR-022 | Variant reclassification alerts | **Done with live data**: current classes come from NCBI ClinVar (`/clinic`, `POST /api/lifecycle/reclassify/live`). Automatic nightly feed and push to citizens: **Not done** |
| SF-3 / FR-028 | Multi-loop pedigree builder | **Done** (`/nasab`: loop questions answered with taps, relatedness from the existing engine). Several loops at once use the largest loop with a warning, not a full multi-loop pedigree |
| FR-029 | Low-literacy audio-visual mode | Read-aloud, two reading levels and the 10-item yes/unsure/no scoring **Done**. Spoken Emirati-dialect audio: **External** (needs recorded, reviewed audio) |
| FF-1..3 | Long-read, newborn, cross-GCC | Out of scope per the PRD |

## Out-of-the-box items and problems

| PRD | Item | Status |
|---|---|---|
| OOB-1 | Wifaaq-Zero pre-engagement handshake | PIN pairing **Done**; enclave and QR/NFC: **External / Not done** |
| OOB-2 | Silah-Whisper anonymous vouchers | **Done** (no sender column, random 24-72 h delay, stored) |
| OOB-3 | Safe Vault | Decoy PIN with lockout **Done**. Screenshot blocking and forensic watermark are native-app features: **Not done** |
| OOB-4 | Nasab-Graph | **Done** (see SF-3) |
| OOB-5 | Itemised billing and double-entry ledger | **Simulated**: exact-money ledger, idempotent posting, QC refund, blinded receipt (`/journey`). Shafafiya and payment rails: **External** |
| OOB-6 | 8-stage live lab tracker | **Done** (`/journey`, stored); live HL7 feed: **External** |
| OOB-7 | DNA privacy passbook with push alerts | Audit trail **Done**; push notifications: **Not done** |
| OOB-8 | 90-day certificate countdown | **Done** (`/journey`, alerts at 60/30/14/7 days) |
| OOB-9 | Majlis elders mode | **Not done**: needs reviewed Gulf-dialect content; not invented |
| OOB-10 | Lifecycle re-engagement | **Done** (`/plan`, 6/12-month milestones); automatic notifications: **Not done** |
| P-01..P-18 | Day-to-day problems | Mapped to the rows above |

## Non-functional requirements

| NFR | Status |
|---|---|
| Privacy, k-anonymity, audit chain (NFR-002, 008) | **Done** (suppression under 10 in the demo; the PRD's k of 50 is a config change) |
| Offline operation (NFR-014) | **Partly done**: installable PWA that caches the app shell and static files; API data is deliberately never cached; encrypted offline queues: **Not done** |
| Accessibility, RTL, readability (NFR-011..013) | Seven languages, Arabic RTL, large text and contrast **Done**; formal WCAG audit: **Not done** |
| Sovereign hosting, HSM, FIPS, ADHICS audit (NFR-001, 009, 015, 018) | **External**; the demo runs on Vercel, Render and Neon |
| Performance and 99.95% availability (NFR-003, 005) | **Not measured**; the free hosting tier sleeps when idle |

## Data sources

- **Live and real**: NCBI ClinVar classes and gnomAD v4 allele frequencies (only variant ids are sent; no person data).
- **Synthetic by design**: people, results, the 30-condition panel and cohort. The panel stays fictional so the golden files and the
  non-stigma and evaluation suites remain valid; replacing it needs a real condition list and genetics review.

## Persistence and hosting

Pairings, the lab sample, token nonces, vouchers, vault hashes and bookings are stored through `services/lifecycle/store.py`
(SQLAlchemy; Postgres through `DATABASE_URL`, SQLite locally). Alembic revisions `0002` and `0003` create the tables. The web app is on
Vercel, the API on Render in Virginia (`kinsight-api-va`, next to the database; `render.yaml`), Postgres on Neon (free tier, Washington D.C.). Free-plan limits: the API sleeps when idle, so the first request after a quiet spell shows a "waking up" notice.

## Data and screens added after the first pass

- **Counsellor console:** a 40-case synthetic caseload from the demo cohort (paged, tier-mixed), read through the same consent policy; allowed rows are audited once per list, refusals per case.
- **Privacy centre:** shows the person's real access trail (`GET /api/me/access-log`), not a sample.
- **Family circle and family tree questions:** the API returns the full demo family; the page lays out three generations with labels and the consanguinity double line.
- **Clinic tools:** live ClinVar reclassification and a gene-by-gene ClinVar variant explorer; live gnomAD frequencies.
- **Fixed in the same pass:** garbled characters in two adapters, raw condition ids in real mode, an `/ask` hydration error, role pages that were empty in new tabs.

## Not adopted on purpose

- Instrument item text (DCS, PAGIS, RGCS-DA, GCOS-24) is not reproduced; only scoring is implemented.
- PRD cost, ROI and accuracy figures come from the PRD's own citations and are not claims of this repository.
- Religious or legal guidance text is not generated; only dates and calendar facts are computed.
- Everything about real people stays out: no real genomes, no real accounts.
