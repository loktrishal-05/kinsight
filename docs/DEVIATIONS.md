# Deviations from the spec
- Python 3.10/3.11 available locally rather than 3.12; `requires-python >=3.10`. `uv` not installed; plain `pip` + `pyproject.toml`.
- Case config: reexplain_max=1 (spec node table says max 2 re-explanations, route text says a second failed quiz must go to a counsellor; we follow the route text).
- Web: lightweight message-file i18n context instead of next-intl; shadcn/ui not used (Tailwind components); Playwright screenshots pending (vitest mock-flow tests exist). opencode could not be launched (auto-approve mode refused by Claude Code permission check), so Claude wrote web/ directly.
- Demo path: step 7 (family invite/decline/limit/revoke) is covered by the privacy suite (invitations, revocation) but not inside run_demo_path; backend is in-memory for one demo couple (services/api/backend.py), Postgres checkpointer not wired. Codex's second job stalled and was stopped; backend written by Claude.
