# Deviations from the spec
- Python 3.10/3.11 available locally rather than 3.12; `requires-python >=3.10`. `uv` not installed; plain `pip` + `pyproject.toml`.
- Case config: reexplain_max=1 (spec node table says max 2 re-explanations, route text says a second failed quiz must go to a counsellor; we follow the route text).
- Web: lightweight message-file i18n context instead of next-intl; shadcn/ui not used (Tailwind components); Playwright screenshots pending (vitest mock-flow tests exist). opencode could not be launched (auto-approve mode refused by Claude Code permission check), so Claude wrote web/ directly.
