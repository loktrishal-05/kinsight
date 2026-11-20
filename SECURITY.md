# Security policy

Security fixes target the current default branch. Report a vulnerability privately using [GitHub vulnerability reporting](https://github.com/loktrishal-05/kinsight/security/advisories/new). Include the affected version, affected feature and impact. Use synthetic examples and remove credentials and personal information from attachments.

| Threat | Current control |
| --- | --- |
| Access to someone else's synthetic report | Server-side subject assignment, consent decisions, and scoped responses |
| Release of an incorrect or outdated result | Approval bound to a report revision, with source revalidation for confirmed FHIR imports |
| Forged or replayed lab updates | Signed delivery envelope, time window, persistent delivery IDs, and request limits |
| Disclosure through audit logs | Salted references and content-free hash-chained events |
| Accidental use of real health records in the demo | Synthetic fixture tags, demo-only identity, and opt-in integration endpoints |

| Browser attacks (framing, injected scripts, cross-site reads) | Content-Security-Policy, HSTS, `frame-ancestors 'none'`, Permissions-Policy, COOP/CORP; API CORS allow-list (none by default) and a 1 MiB body cap |

The full STRIDE and LINDDUN analysis, with the test for each control, is in [docs/architecture/threat-model.md](docs/architecture/threat-model.md).
