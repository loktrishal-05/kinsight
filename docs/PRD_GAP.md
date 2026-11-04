# Gap analysis: Silah-Genomics master PRD vs KinSight

Source: `silah_genomics_complete_master_prd.pdf` (research monograph, 64-section blueprint, OOB-1..10, P-01..P-18, 30 judge Q&As).
KinSight already covers the challenge's six mandates in a synthetic demo. This file lists what the PRD adds that was missing.

Legend: **Done** = in repo before this pass. **Core added** = deterministic module + tests in `services/lifecycle/` (this pass),
wired to `/api/lifecycle/*` (flag `lifecycle`) and the `/journey` screen where noted. **Open** = not started. **External** = needs a real system or approval, only simulated.

## Core features

| PRD | Item | Status |
|---|---|---|
| CF-1 / FR-004 | Bilateral consent, PIN pairing, 3 per 30 days, 1-tap revoke | Consent + revoke Done; PIN pairing **Core added** (`pairing.py`); QR is a UI job |
| CF-2 / FR-007 | Zero-leakage compatibility (APSI/SMPC) | Demo PSI Done (`psi_demo.py`, flagged off); compound-het detection **Core added** (`triage` RULE-05); real enclave **External** |
| CF-2 / FR-008 | Kinship, consanguinity-adjusted residual risk | Done (`genetics/kinship.py`, `assess.py`); homomorphic KING **External** |
| CF-3 / FR-009,010 | Plain-language explainer, 100-icon array, twin view | Done; dual-vault (individual vs couple) **Open** at storage level |
| CF-4 / FR-012 | Teach-back | Done (5 questions; PRD says 4 plus a hard gate before certificate download: **Open**) |
| CF-4 / FR-013,014 | Values clarification, culturally grounded options | Options explorer Done; RGCS-DA scoring and Fiqh / 120-day clock content **Open** (needs licensed items + reviewed text) |
| CF-5 / FR-015 | Deterministic escalation rules | Tier rules Done; PRD rule set (orthogonal hold, multi-gene, pregnancy window, DCS) **Core added** (`triage.py`) |
| CF-5 / FR-016,017 | Priority booking, pre-consult brief | Brief Done; booking **Open** |
| CF-6 / FR-018,019 | Confirmatory orders, closed-loop referral | Referral state machine Done; 72 h stall check **Core added** (`tracking.referral_stalled`) |
| CF-6 / FR-020 | TAMM attendance-only webhook | **Core added** (`safety.tamm_attestation`, fixed key allow-list) |
| CF-6 / FR-021 | 24 h single-use cascade token | **Core added** (`cascade.CascadeTokens`, HMAC not AES-CBC, see module note) |
| FR-024,025 | MMIC / DCS / GCOS metrics, equity dashboard | Equity dashboard Done; DCS scoring **Core added**; MMIC, GCOS-24 **Open** |
| FR-026 | Malaffi sealed publishing | **External** (FHIR export function exists, no route) |
| FR-027 | Citizen audit timeline | Hash-chained audit Done; "who accessed my data" screen Done (`/access`) |

## Secondary and future

| PRD | Item | Status |
|---|---|---|
| SF-1 / FR-023 | Waiting-period check-in (PAGIS) | Flag rule + synthetic check-in API **Core added** (`safety.pagis_flag`); screen **Open** |
| SF-2 / FR-022 | Variant reclassification alerts | **Core added** (`safety.reclassification`); feed + push **Open** |
| SF-3 / FR-028 | Multi-loop pedigree builder | Pedigree view and kinship Done; conversational Nasab-Graph builder **Open** |
| FR-029 | Audio-visual low-literacy mode | Read-aloud + two reading levels Done; Gulf-dialect audio, 10-item low-literacy DCS scoring **Core added** |
| FR-030 | Break-glass | **Core added** (`safety.break_glass`, dual attestation) |
| FF-1..3 | Long-read, newborn, cross-GCC | Out of scope per PRD |

## Out-of-the-box (OOB) and problems

| PRD | Item | Status |
|---|---|---|
| OOB-1 | Wifaaq-Zero pre-engagement handshake | PIN pairing **Core added**; UI + enclave **Open / External** |
| OOB-2 | Silah-Whisper anonymous vouchers | **Core added** (`cascade.WhisperQueue`: no sender column, 24-72 h jitter) |
| OOB-3 | Safe Vault: screenshot block, watermark, decoy PIN | Decoy PIN hashing **Core added**; FLAG_SECURE / watermark are native-app features **Open** |
| OOB-4 | Nasab-Graph builder | **Open** |
| OOB-5 | Itemised billing, split-pay, double-entry ledger | **Core added** (`ledger.py`, Decimal, idempotent, QC refund, blinded receipt); Shafafiya **External** |
| OOB-6 | 8-stage live lab tracker | **Core added** (`tracking.py`); screen + feed **Open** |
| OOB-7 | Privacy passbook with push alerts | Audit chain + `/access` Done; push alerts **Open** |
| OOB-8 | 90-day certificate countdown | **Core added** (`tracking.certificate_status`); screen **Open** |
| OOB-9 | Majlis elders mode | **Open**, needs reviewed Gulf-dialect content |
| OOB-10 | Lifecycle re-engagement | **Core added** (`tracking.reengagement_due`); notifications **Open** |
| P-01..P-18 | Day-to-day problems | Mapped to the rows above |

## Not adopted on purpose

- Pregnancy and "Class 4/5 only" rules take effect in `triage.py`; the existing tier engine is unchanged so golden files still hold.
- Instrument item text (DCS, PAGIS, RGCS-DA) is not reproduced; only scoring is implemented. Licensing is needed for items.
- PRD cost, ROI and accuracy figures (for example 69.3% deflection, AED 350M saved) come from the PRD's citations and are not claims of this repo.
- Everything stays synthetic; UAE Pass, Malaffi, TAMM, Shafafiya, M42 and HSM integrations are not built and cannot be without sandbox access.

## Wired in this pass

`/api/lifecycle/{tracker,certificate,pairing,receipt,cascade}` (role-gated, rate-limited, every change in the audit chain) and the
`/journey` screen (lab tracker, certificate countdown, PIN pairing with stop-sharing, own-lines receipt, one-time family link) in
seven languages plus Urdu. Demo state is in memory, synthetic, and resets on restart.

The remaining synthetic APIs are now wired under `/api/lifecycle/`: `triage`, `whisper`, `whisper/dispatch`, `checkin`,
`reclassify`, `safe-vault`, `safe-vault/unlock`, `tamm`, and `break-glass`. All are role-gated and audited; person submissions
are rate-limited. Whisper accepts `contact` (7–20 digits with an optional `+`), returns only a queued status, and keeps voucher
references and content out of the audit chain. Safe Vault stores only per-actor scrypt hashes and locks unlock attempts after
five failures for the app session, including after PIN reconfiguration. Real and decoy unlocks share the same audit action.
Request bodies reject unknown fields and bound lists, identifiers and scores: triage lists and reclassification maps allow
up to 200 entries, DCS allows 1–16 answers, low-literacy DCS requires 10 answers, and PAGIS totals accept 0–200.
Instrument item text and clinical advice are not included. These routes have integration coverage; screens are separate work.

## Next build steps (in order)

1. Screens for triage (counsellor), Whisper vouchers, reclassification alerts, PAGIS check-in, decoy PIN; persist lifecycle state in Postgres.
3. Hard gate: no couple report download until teach-back passes (PRD Q2).
4. Conversational pedigree builder; MMIC and GCOS-24 scoring; reclassification feed + alert.
5. Dual-vault storage split in the migrations.
