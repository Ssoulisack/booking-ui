import { expect, type Locator, type Page } from "@playwright/test"

export const API = process.env.E2E_API_URL ?? "http://localhost:3000/api/v1"
const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025"

/** The company owner the backend creates from config.yaml (local development values) */
export const OWNER = {
  login: process.env.E2E_OWNER_EMAIL ?? "owner@demo.la",
  password: process.env.E2E_OWNER_PASSWORD ?? "Demo1234!",
}

export const PASSWORD = "Secret123!"

/** A unique email per run, so the test can be repeated on the same database */
export const uniqueEmail = (who: string) =>
  `${who}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@e2e.test`

export async function call<T>(
  path: string,
  {
    method = "GET",
    body,
    token,
  }: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const env = (await res.json()) as {
    success: boolean
    message?: string
    data: T
  }
  if (!env.success)
    throw new Error(`${method} ${path} → ${res.status} ${env.message}`)
  return env.data
}

/** The invite token from the newest email sent to `to` (Mailpit) */
export const inviteToken = (to: string) =>
  emailToken(to, /\/invite\/([A-Za-z0-9_-]+)/)

/** The reset token from the newest password email sent to `to` (Mailpit) */
export const resetToken = (to: string) =>
  emailToken(to, /\/reset-password\/([A-Za-z0-9_-]+)/)

async function emailToken(to: string, link: RegExp): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    ).then((r) => r.json() as Promise<{ messages: Array<{ ID: string }> }>)
    if (search.messages.length > 0) {
      const msg = await fetch(
        `${MAILPIT}/api/v1/message/${search.messages[0].ID}`,
      ).then((r) => r.json() as Promise<{ Text: string }>)
      const match = msg.Text.match(link)
      if (match) return match[1]
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`no email with ${link} for ${to}`)
}

export async function logIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login")
  await page.getByLabel("Email or phone").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Log in" }).click()
}

export async function logOut(page: Page) {
  // the avatar in the top bar (tablets and phones also have a "My account" item in the bottom menu)
  await page
    .getByRole("banner")
    .getByRole("button", { name: "My account" })
    .click()
  await page.getByRole("menuitem", { name: "Log out" }).click()
  await expect(page).toHaveURL(/\/login$/)
}

/** Opens the phone menu and returns the labels of its links */
export async function menuLinks(page: Page): Promise<string[]> {
  await page.getByRole("button", { name: "Menu" }).click()
  const dialog = page.getByRole("dialog")
  const links = await dialog.getByRole("link").allTextContents()
  await page.keyboard.press("Escape")
  return links.map((l) => l.trim())
}

export interface Session {
  access_token: string
  refresh_token: string
  user: unknown
}

export interface Club {
  id: number
  slug: string
  name: string
  ownerToken: string
  owner: Session
}

/**
 * A published branch made through the API by the company owner: Tennis with two courts and a
 * coach, and Boxing with a ring and a daily group class. Open all day every day (a desk test can
 * always find a booking that already started); bookings can be cancelled until 24 h before.
 * Booking mode: account or guest.
 */
export async function publishedClub(
  ownerSession: Session,
  name = `E2E Arena ${Date.now()}`,
): Promise<Club> {
  const owner = ownerSession.access_token
  const biz = await call<{ id: number; slug: string }>("/company/branches", {
    method: "POST",
    token: owner,
    body: { name },
  })
  const m = `/branches/${biz.id}`
  const post = <T>(path: string, body: unknown) =>
    call<T>(m + path, { method: "POST", token: owner, body })
  const put = (path: string, body: unknown) =>
    call(m + path, { method: "PUT", token: owner, body })

  const settings = await call<Record<string, unknown>>(m + "/settings", {
    token: owner,
  })
  await put("/settings", {
    ...settings,
    booking_mode: "both",
    booking_policy: "Free cancellation up to 24 hours before.",
    province: "luang_prabang",
    address: "Ban Wat That, Luang Prabang",
  })
  const tennis = (
    await post<{ id: number }>("/sports", { name: "Tennis", type: "tennis" })
  ).id
  const boxing = (
    await post<{ id: number }>("/sports", { name: "Boxing", type: "boxing" })
  ).id
  const court1 = (
    await post<{ id: number }>("/resources", {
      sport_id: tennis,
      name: "Court 1",
      kind: "court",
    })
  ).id
  const court2 = (
    await post<{ id: number }>("/resources", {
      sport_id: tennis,
      name: "Court 2",
      kind: "court",
    })
  ).id
  const ring = (
    await post<{ id: number }>("/resources", {
      sport_id: boxing,
      name: "Ring",
      kind: "ring",
    })
  ).id
  const coach = (
    await post<{ id: number }>("/coaches", {
      name: "Somchai",
      sport_ids: [tennis],
    })
  ).id
  const week = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    open: "00:00",
    close: "24:00",
  }))
  for (const [kind, id, price] of [
    ["resource", court1, 150000],
    ["resource", court2, 150000],
    ["resource", ring, 100000],
    ["coach", coach, 200000],
  ] as const) {
    await put(`/opening-hours/${kind}/${id}`, { hours: week })
    await put(`/prices/${kind}/${id}`, {
      price_per_hour: price,
      currency: "LAK",
    })
  }
  const day = (offset: number) =>
    new Date(Date.now() + offset * 86_400_000).toLocaleDateString("en-CA", {
      timeZone: "Asia/Vientiane",
    })
  await post("/class-sessions/repeat", {
    sport_id: boxing,
    resource_id: ring,
    title: "Morning boxing",
    start_time: "08:00",
    end_time: "09:00",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    from: day(2),
    to: day(6),
    capacity: 6,
    price: 50000,
    currency: "LAK",
  })
  await post("/publish", {})
  return {
    id: biz.id,
    slug: biz.slug,
    name,
    ownerToken: owner,
    owner: ownerSession,
  }
}

/**
 * Puts a logged-in session in the browser without using the (rate-limited) login form.
 * Log out first if someone is logged in: the running app would save its own session over this one.
 */
export async function signInAs(page: Page, auth: Session) {
  await page.goto("/login")
  await page.evaluate((a) => {
    localStorage.setItem(
      "booking.session",
      JSON.stringify({
        state: {
          accessToken: a.access_token,
          refreshToken: a.refresh_token,
          user: a.user,
        },
        version: 0,
      }),
    )
  }, auth)
}

/** The one-time question for accounts without a nationality (existing or invited): answer it */
export async function answerNationality(page: Page, nationality = "TH") {
  await expect(page).toHaveURL(/\/account\/profile\?complete=1/)
  await page.getByLabel("Nationality").selectOption(nationality)
  await page.getByRole("button", { name: "Continue" }).click()
}

/** The same, only if this account is asked (e.g. the shared Super Admin after the first run) */
export async function answerNationalityIfAsked(page: Page, nationality = "TH") {
  await page.waitForLoadState("networkidle")
  if (/\/account\/profile\?complete=1/.test(page.url()))
    await answerNationality(page, nationality)
}

/** Gives an account its nationality through the API, so it is not asked in the browser */
export async function setNationality(session: Session, name: string) {
  const user = session.user as { email: string }
  await call("/auth/me", {
    method: "PUT",
    token: session.access_token,
    body: { name, nationality: "TH", email: user.email, phone: "" },
  })
}

/** At least `n` branches in the company (extra ones are empty drafts), for the long-list screens */
export async function atLeastBranches(owner: Session, n: number) {
  const have = await call<unknown[]>("/company/branches", {
    token: owner.access_token,
  })
  for (let i = have.length; i < n; i++) {
    await call("/company/branches", {
      method: "POST",
      token: owner.access_token,
      body: { name: `E2E Draft ${Date.now()}-${i}` },
    })
  }
}

/** At least `n` live branches, so the brand home shows its search and filters (from 5) */
export async function atLeastLiveBranches(owner: Session, n: number) {
  const live = await call<unknown[]>("/public/branches?limit=100")
  for (let i = live.length; i < n; i++) await publishedClub(owner)
}

/** Presses a hold button (React Bits HoldButton) long enough to confirm, then lets go */
export async function holdButton(page: Page, button: Locator, ms = 1700) {
  await button.scrollIntoViewIfNeeded()
  const box = (await button.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
}
