# Scoped implementation notes

These entries belong in docs/OPEN_QUESTIONS.md and docs/DEVIATIONS.md when the
documentation owner integrates them. This task explicitly limits writes to consent,
API, and privacy tests (plus a new privacy config).

- P2-1: `decide` keeps the four specified positional arguments and requires a
  keyword SQLAlchemy session and audit salt. The caller owns the transaction and
  must commit denials before raising an HTTP error. UTC epoch timestamps avoid
  SQLite/Postgres timezone differences.
- P2-1: the scope vocabulary omits `couple_pooling` from its table but requires it
  in prose. It is a separate prerequisite, never a grant of read access.
- P2-1: grants for condition findings require a single condition resource;
  unscoped arrays of findings are never released by that grant.
- P2-4: the chain detects modified rows, internal deletion and forks. Detecting tail
  truncation or wholesale rewriting requires an independently stored head hash;
  `verify_chain(expected_head=...)` supports this. Provision an append-only database
  role and external anchoring before production. Concurrent appends conflict on a
  unique predecessor and return HTTP 409; retry the complete request.
- P2-2: demo login requires `KINSIGHT_DEMO_AUTH=1`. Set distinct environment values
  of at least 32 bytes for `KINSIGHT_TOKEN_SECRET` and `KINSIGHT_AUDIT_SALT`.
  Tokens use a fixed HMAC-SHA256 envelope with no selectable algorithm, rather than
  a third-party JWT library. Personas are fictional and publicly selectable only
  in explicitly enabled demo mode.
- P2-3: accepting an invitation creates no read or pooling consent. Both people
  grant pooling separately after viewing their own results. A separate summary
  or tier grant permits sharing. Decline responses reveal no reason or partner data.
  New results must clear `Person.result_viewed_at` and the couple release flag.
- Scope interpretation: `couple_summary` covers a minimal risk-only summary (no
  individual status/genotypes), case brief block references and referral timeline;
  `quiz_status` covers quiz state. Case grants still require assignment, expiry and
  reason. Neither a pooling grant nor a role alone releases a couple result.
- Aggregates: only server-owned immutable disjoint count partitions are supported.
  A small cell suppresses the entire partition (conservative complementary
  suppression). No totals or client filters are accepted. Releases are cached and
  all callers share one durable epsilon ledger, never reset by the demo routes.
  The deterministic suppression decision means this is not a claim of end-to-end
  formal differential privacy. Continuous wait-time statistics need a separately
  reviewed bounded-sensitivity mechanism; the default adapter returns 503.
- P3-8: `create_app(database_url, backend)` accepts a small adapter interface for
  genetics, validated pedigrees, reviewed explanations and agent/case workflows.
  The default adapter returns 503; it never fabricates figures or workflow success.
  Backend implementations must use the passed transaction, enforce ownership of
  result ids, and delete results, relationships and checkpoints in `delete_person`.
  Couple responses are reauthorized after adapter awaits. The stream has no
  connected event source; copilot emits a fixed unavailable message and invokes no
  tools. Graph resumption and tier-3 release gates remain the agent owner's work.
- Storage uses SQLAlchemy 2 `create_all` for local SQLite tests. The migration owner
  should import `services.consent.models.Base.metadata` into Alembic. Postgres
  deployment and database roles have not been exercised here.
- Environment: `.git` is read-only and outbound package/Git access is blocked.
  The initial environment lacked API dependencies, but compatible cached wheels
  were found and extracted into the OS temporary directory for test execution.
  `make` is unavailable and scripts/demo.py is absent from this clone. Task commits
  and pushes must be performed in a writable Git checkout by the integrator.
