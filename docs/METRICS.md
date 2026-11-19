# Outcome metrics

KinSight measures whether people **understand** their results and **reach care**. It does not measure marriages, engagements, pregnancies or any reproductive choice, and there is no code path that could. A test (`tests/integration/test_outcome_metrics.py`) fails if such a metric is ever added.

Definitions live in one place, `services/analytics/events.py`. The analyst sees them at `/analyst` ("Outcome measures") through `GET /api/analytics/outcomes`, which requires the analyst role and writes an audit event.

| Metric | Counts | Source | Grouping |
| --- | --- | --- | --- |
| `result_viewed` | People who opened their own result | `consent_person.result_viewed_at` | language / reading level, rate |
| `teach_back_passed` | People who passed the understanding check | audit action `teach_back_passed` | language / reading level, rate |
| `prep_sheet_created` | People with a preparation sheet | `lc_prep_sheet` | language / reading level, rate |
| `prep_sheet_shared` | People who shared part of it with a counsellor | `lc_prep_sheet.shared` | language / reading level, rate |
| `session_booked` | People with a booked counselling session | `lc_booking` (active) | language / reading level, rate |
| `counsellor_requested` | Requests to talk with a counsellor | review queue, `counselling_request` | total |
| `cascade_reached` | Relatives the person chose to reach (invite, notice or in person) | `lc_cascade_contact` | total |
| `cascade_tested` | Relatives who reported getting tested | `lc_cascade_contact` status `tested` | total |
| `imports_confirmed` | Reports imported from an EHR sandbox | `lc_fhir_import` | total |
| `reviews_overdue` | Counsellor review items past their expected time | review queue `due_at` | total |

## Privacy

- Counts use the same threshold as the cohort aggregates (`configs/privacy.yaml`, `min_cell: 10`). If any group in a breakdown is below it, the whole breakdown is hidden, so a hidden cell cannot be worked out from the others.
- These are operational counts with threshold suppression. They are **not** released through the differential-privacy budget, which is reserved for the fixed cohort partitions. They carry no ids.
- Relatives are counted only as totals; nothing links a relative to the person who reached them.

## Equity alert

For rate metrics, the dashboard raises an alert when the rate differs by more than 10 percentage points between any two language and reading-level groups that are both large enough to show.

## Not yet measured

- Time between referral stages: the referral state lives in the case workflow. It is shown per case to the counsellor but not yet aggregated.
- Attendance at sessions: the demo has bookings but no attendance record.
