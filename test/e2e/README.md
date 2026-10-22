# Browser tests (Playwright)

They drive the real app against the **local** backend and read emails from Mailpit, so start
those first:

```sh
# in ../booking-system-backend
docker compose up -d postgres redis mailpit
make run
# here
npx playwright install chromium   # once
npm run test:e2e                  # starts the dev server on 5173 if nothing runs there
```

- `roles.spec.ts` and `password.spec.ts` run on a phone (Pixel 7); `public.spec.ts` and `setup.spec.ts` run on a phone
  and a tablet (iPad Mini); `desk.spec.ts`, `identity.spec.ts` and `company.spec.ts` run on the tablet only.
- Specs share one club per run; keep changes that affect others (e.g. closed days) away from today.
- `global-setup.ts` runs once per run: one login of the company owner (from the backend's `config.yaml`, default
  `owner@demo.la` / `Demo1234!`), one customer account and one published branch, shared by all specs through
  environment variables. Each run adds branches and users (`…@e2e.test`) to the **dev** database (`booking_dev`).
- **Rate limits** (per IP, in the backend's memory): 10 logins and 10 invite accepts per 15 minutes, 10 registrations per
  hour, 60 bookings per hour. A full run fits in one go (checked 2026-10-22: 25 tests, no "Too many tries"), but
  only once per 15 minutes: restart the backend to reset the counters before running it again. `password.spec.ts` alone uses only 1 registration.
- Overrides: `E2E_WEB_URL` (use an already running frontend, e.g. `http://localhost:5174`), `E2E_API_URL`,
  `E2E_MAILPIT_URL`, `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD`.
