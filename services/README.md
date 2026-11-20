# Backend services

Python packages behind the KinSight API. Imports only point down this stack, enforced by [`tests/unit/test_architecture.py`](../tests/unit/test_architecture.py):

```
api            HTTP layer: main.py (app factory, core routes), routes/ (one module per feature), demo/ (fictional data)
  agents       explanations, Kin tools, preparation, teach-back, referrals
  lifecycle    lab tracking, counsellor review queue, booking, cascade tracking, reference data
  analytics    outcome measures with small-cell suppression
    cohort        synthetic condition panel and people
    integrations  FHIR R4 client and referral write-back, HL7 v2 parsing
      genetics   deterministic engine: kinship, risk, scenarios (no network, database or model)
      consent    default-deny policy, grants, field projection, hash-chained audit
```

See the [architecture overview](../docs/architecture/overview.md) for diagrams and the request lifecycle.
