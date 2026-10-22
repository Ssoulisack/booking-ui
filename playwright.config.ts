import { defineConfig, devices } from "@playwright/test"

// Runs against the local backend (make run, port 3000) and Mailpit (8025); see test/e2e/README.md.
// E2E_WEB_URL points at an already running frontend instead of starting one on 5173.
const web = process.env.E2E_WEB_URL ?? "http://localhost:5173"

export default defineConfig({
  testDir: "test/e2e",
  globalSetup: "./test/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: web,
    trace: "retain-on-failure",
  },
  projects: [
    // phone first: the screen most customers use
    {
      name: "phone",
      use: { ...devices["Pixel 7"] },
      testIgnore: /(desk|identity|company)\.spec\.ts/, // the desk and the company area run on a tablet or laptop
    },
    // public pages and the dashboard set-up again on a tablet (counter tablets); login-heavy specs stay phone-only
    {
      name: "tablet",
      use: { ...devices["iPad Mini"], defaultBrowserType: "chromium" },
      testMatch: /(public|setup|desk|identity|company|home)\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: web,
    reuseExistingServer: true,
  },
})
