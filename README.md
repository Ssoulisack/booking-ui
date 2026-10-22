# Booking — frontend

React app of the booking system, **client edition**: one install = one company with branches.

| Path                                                      | Who                              | What                                                             |
| --------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `/`                                                       | Guests and customers             | The live branches (search, sport and province filters)           |
| `/b/{slug}` (+ `/book`, `/confirmed`, `/booking/{token}`) | Everyone (customers, guests)     | A branch's booking page: book, confirm, guest link (phone first) |
| `/account`                                                | Logged-in customers              | My bookings at every branch                                      |
| `/company`                                                | Owner, admins                    | Branches, team, customers, reports, accounts, rules, settings    |
| `/dashboard/{branchId}`                                   | Manager, staff (+ owner, admins) | One branch's dashboard (menu depends on the role)                |
| `/login`, `/register`, `/forgot-password`                 | Everyone                         | Log in, create an account, forgot password                       |
| `/reset-password/{token}`, `/invite/{token}`              | From emails                      | Choose a new password, join the team                             |

The backend is `../booking-system-backend` (Go Fiber). The plan and progress of both are in
`../timeline-client-edition/` (the SaaS history is in `../timeline/`).

## Run locally

Needs Node **20.19+ or 22.12+** (Vite 8). The backend must be running on port 3000 (`make run`
in the backend, with `docker compose up -d postgres redis mailpit`).

```sh
cp .env.example .env   # VITE_API_URL=http://localhost:3000/api/v1
npm install            # .npmrc sets legacy-peer-deps (works around an npm peer-resolution crash)
                       # so peer packages are NOT installed for you: add them to package.json
                       # (check with: npm ls --all | grep "UNMET DEPENDENCY")
npm run dev            # http://localhost:5173
```

Dev login (local database `booking_dev`): the company owner the backend creates from its `config.yaml`
(`company` block) on the first start — `owner@demo.la` / `Demo1234!`. Browser tests add branches and accounts
(`…@e2e.test`) each run.
Emails (invites, password resets) arrive in Mailpit: http://localhost:8025.

## Scripts

| Command                           | Does                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Dev server on port 5173                                                                     |
| `npm run build`                   | Type-check and build to `dist/`                                                             |
| `npm run lint`                    | oxlint                                                                                      |
| `npm run format` / `format:check` | Prettier (with Tailwind class sorting)                                                      |
| `npm test`                        | Unit tests (Vitest, `test/unit/`)                                                           |
| `npm run test:e2e`                | Browser tests (Playwright, `test/e2e/`) against the local backend; see `test/e2e/README.md` |

## Stack

Vite + React 19 + TypeScript · React Router · TanStack Query (server data) · Zustand (session,
selected business) · React Hook Form + Zod · Tailwind CSS v4 + shadcn/ui · i18next (English;
Lao and Thai files ready) · date-fns + date-fns-tz · Noto Sans (+ Lao, Thai) · lucide-react ·
colord · React Bits (BlurText, CountUp, ClickSpark; public pages only, in `src/components/reactbits/`) with motion.

## Code map

```
src/
  lib/api/        API client: {success, message, data, meta} envelope, ApiError(code),
                  automatic token refresh (one at a time), forced logout on disabled / revoked
  lib/errors.ts   API error code → readable sentence (i18n "errors" namespace)
  stores/         Zustand: session (tokens + user, saved), current branch (saved)
  i18n/           i18next set-up; locales/{en,lo,th}/{common,errors}.json
  routes/         router (each area loads on demand), guards (login, company area, start page)
  layouts/        AuthLayout (login pages), AppShell (top bar, side menu / sheet), UserMenu
  features/
    auth/         login, register, forgot / reset password, accept invite; landing rules
    company/      owner and admins: overview, branches, team (invite, roles, branches), customers,
                  company report, accounts (set a password), booking rule, company settings
    dashboard/    one branch: switcher, role-based menu, RequireRole; Overview (publish checklist, QR),
                  setup/ (sports, courts, coaches, hours, prices, classes, closed days, rules),
                  branch Settings (own details + company overrides); api.ts holds every branch call;
                  desk/ (calendar, bookings, booking panel, walk-ins, customers, cash-up,
                  reports with charts)
    settings/     form pieces shared by the company and branch settings
    places/       the public home: live branches
    account/      My bookings: every branch, upcoming / past, cancel; My account
    public/       /b/{slug}: brand colours, booking panel, checkout, confirmation, guest link
  components/     form helpers, page states; ui/ = shadcn/ui (generated, edit sparingly)
test/
  unit/           Vitest
  e2e/            Playwright
```

## Conventions

- Screen priority for the public page: **phone, then tablet, then desktop**. Tap targets stay
  at least 44 px up to laptop width (`h-11 lg:h-9`).
- API failures carry the backend code (`ApiError.code`); show them with `errorMessage(err, t)`.
  Every code the backend can send has an English text in `src/i18n/locales/en/errors.json`.
- Branch access is checked by the backend on every request; the dashboard also re-reads the
  branch list on each page change, so someone switched off is sent to login on the next click.
- Public pages: the company's brand colour comes in as CSS variables (`brand.ts`), so shadcn buttons follow it;
  the choice being booked lives in the URL (`selection.ts`); times always show in the branch's time zone.
- React Bits components are copied code: read them before updating, keep them to the public pages, and check
  they respect reduced motion.
- Config only through `VITE_*` variables in `.env` (never secrets: everything in the frontend is public).
