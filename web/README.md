# KinSight web app

Next.js 16, React 19, TypeScript, Tailwind. Seven languages, including Arabic right-to-left.

| Path | Contents |
| --- | --- |
| `app/` | One folder per route (person, couple, counsellor, analyst and public pages) |
| `components/` | Shared UI: `ui.tsx` (PageHeader, Estimate, Notice, Skeleton, ErrorState, EmptyState), the app shell, Kin |
| `lib/api.ts` | The API contract, validated with zod, with two implementations: `real.ts` (HTTP) and `mock.ts` (engine-exported fixtures in `lib/fixtures/`) |
| `lib/` | Browser logic: report reading, study, notifications, voice, i18n |
| `messages/` | Translations, one JSON file per language |
| `tests/` | Vitest unit tests |
| `e2e/`, `e2e-live/` | Playwright tests (desktop and phone, mock mode) and live-integration tests |

```sh
npm ci
npm run dev        # http://localhost:3000, mock mode by default
npm run check      # type check, lint, unit tests
npx playwright test
```

Design rules are in [DESIGN.md](DESIGN.md); product principles in [PRODUCT.md](PRODUCT.md).
