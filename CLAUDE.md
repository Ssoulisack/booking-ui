# CLAUDE.md

Guidance for working in this repository. Status: **DRAFT, written in re-architecture phase 1.** The rules below are the target; folders move over in phases 2–6 (see "Migration status").

## Project

Frontend for the booking system (company → branches: sports courts, classes, restaurant tables, events). React 19 + Vite + React Router 7. Talks to the Go backend in `../booking-system-backend`. Languages: en / lo / th (react-i18next).

## Commands

```bash
npm run dev        # vite (preview stack uses :5174)
npm run build      # tsc -b && vite build
npm run lint       # oxlint
npm run format     # prettier --write .
npm test           # vitest run (152 tests)
npm run test:e2e   # Playwright (phone + tablet, 33 tests)
```

Gate for every change: `npx tsc -b`, `npm test`, and Playwright for UI-flow work. Test files live in `test/` (git-ignored, local only).

## Architecture rules

### Three files per domain
- `src/services/<feature>.api.ts` — plain async functions wrapping our fetch client, typed from `src/types/<feature>.ts`. No React here.
- `src/hooks/use-<feature>.ts` — React Query hooks (`useQuery`/`useMutation`) over the services. They own cache keys, invalidation and the error toast.
- `src/types/<feature>.ts` — request/response types for that domain. (`.ts`, not `.d.ts`.)

### Endpoints
All URL paths live in `src/lib/constants/api-endpoints.ts` (`API_ENDPOINTS`). Never write a path string in a service. Endpoints that take ids are functions: `API_ENDPOINTS.BRANCH.BOOKING(branchId, bookingId)`.

### Folders
- `src/pages/<area>/index.ts` — one entry per area (`public`, `auth`, `account`, `dashboard`, `company`). It only re-exports the route components, so the router can lazy-load each area as its own download. No code lives here.
- `src/components/ui/` — primitives (shadcn). `global/` — shared pieces (forms, pickers, floor-plan, booking). `layout/` — shells (Dashboard, Company, Public, Account, Setup, Auth), breadcrumbs, user menu. `provider/` — app-wide providers and contexts.
- `src/components/protected/<feature>/` — logged-in UI: `branch` (dashboard home, settings, Telegram, share), `desk` (bookings, calendar, reports, cash-up), `package`, `setup` (courts, sports, coaches, classes, events, closures, rules, payments), `company`, `account`, `settings`, `media`.
- `src/components/public/<feature>/` — customer-facing UI: `booking` (branch page, checkout, pay, events), `home`, `auth`, `legal`.
- `src/lib/constants/` — endpoints today; navigation, breadcrumbs, roles in phase 5.
- `src/stores/` — zustand, client-only state (session, active branch, unsaved guard). Server data goes through React Query, never zustand.

### Errors
The fetch client (`src/lib/api/client.ts`) maps server error codes to text. Every mutation hook shows errors through ONE shared helper (toast). Do not hand-roll `toast.error` in components for API failures.

### i18n
Add every user-visible string to all three locale files (en, lo, th); the parity test fails otherwise.

## Working rules
- No behaviour, URL or backend contract changes inside a re-architecture phase; moves and renames only.
- Customer UI is phone-first. Lao phone number is the customer identity.
- Prefer small, reviewable commits; commit only when asked.

## Migration status
| Phase | Scope | State |
|---|---|---|
| 1 | Baseline, `rearch` branch, this file | done |
| 2 | Foundation: API_ENDPOINTS, split `lib/api/types.ts`, toast helper, provider/global folders | done |
| 3 | Services + hooks per feature | done |
| 4 | UI to `components/protected|public|layout`, route entries in `pages/` | done |
| 5 | Nav / breadcrumb / roles config, router | next |
| 6 | Cleanup, README, full tests | — |

Services (`src/services/*.api.ts`) and hooks (`src/hooks/use-*.ts`) are in place; no component imports a service or the fetch client. `src/features/` is gone.
