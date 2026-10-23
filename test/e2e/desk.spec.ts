import { expect, test, type Page } from "@playwright/test"

import {
  call,
  inviteToken,
  logOut,
  menuLinks,
  setNationality,
  PASSWORD,
  publishedClub,
  signInAs,
  uniqueEmail,
  type Club,
  type Session,
} from "./helpers"

// 6d "Done when": a staff member runs a whole day (walk-in, payment, no-show, cash-up) and a manager
// reads the month's finance. Runs on the tablet (the counter screen).

const club = JSON.parse(process.env.E2E_CLUB!) as Club

/** A new team member of the shared club, joined through the email invite */
async function member(
  role: "staff" | "manager",
  name: string,
): Promise<Session> {
  const email = uniqueEmail(role)
  await call("/company/invitations", {
    method: "POST",
    token: club.ownerToken,
    body: { email, role, branch_ids: [club.id] },
  })
  const session = await call<Session>(
    `/invitations/${await inviteToken(email)}/accept`,
    {
      method: "POST",
      body: { name, password: PASSWORD },
    },
  )
  await setNationality(session, name)
  return session
}

async function walkIn(page: Page, name: string, court: string) {
  await page.getByRole("button", { name: "New booking", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Full name").fill(name)
  await dialog.getByLabel("Phone").fill("020 5555 4321")
  await dialog.getByRole("combobox", { name: "Spaces" }).click()
  await page.getByRole("option", { name: court }).click()
  // the first start of the day: earlier today is allowed at the desk, and it has already started
  const first = dialog
    .getByRole("radiogroup", { name: "Start time" })
    .getByRole("radio")
    .first()
  await expect(async () => {
    await first.click({ timeout: 2000 })
    await expect(first).toHaveAttribute("aria-checked", "true", {
      timeout: 1000,
    })
  }).toPass()
  await dialog.getByRole("button", { name: "Book", exact: true }).click()
  await expect(page.getByText(/^Booked: /)).toBeVisible()
  await expect(page.getByRole("dialog", { name: court })).toBeVisible() // the booking opens
}

test("a staff member runs the day and a manager reads the month's money", async ({
  page,
}) => {
  const staff = await member("staff", "Kham Staff")
  const manager = await member("manager", "Mali Manager")

  // --- the desk: walk-in paid in cash, then a no-show ---
  await signInAs(page, staff)
  await page.goto(`/dashboard/${club.id}`)
  await page.getByRole("link", { name: "Calendar" }).first().click()
  await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible()

  await walkIn(page, "Kham Walk-in", "Court 1")
  await page.getByRole("button", { name: "Cash" }).click()
  await expect(page.getByText(/^Paid by Cash/)).toBeVisible()
  await page.keyboard.press("Escape")

  await walkIn(page, "Lee Missing", "Court 2")
  await page.getByRole("button", { name: "No-show" }).click()
  await expect(page.getByText("Marked no-show.")).toBeVisible()
  await page.keyboard.press("Escape")

  // both are on today's calendar
  await expect(page.getByRole("button", { name: /Kham Walk-in/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /Lee Missing/ })).toBeVisible()

  // staff see the desk screens but never reports or finance
  const links = await menuLinks(page)
  expect(links).toEqual(
    expect.arrayContaining(["Calendar", "Bookings", "Customers", "Cash-up"]),
  )
  expect(links).not.toContain("Reports")
  await page.goto(`/dashboard/${club.id}/reports`)
  await expect(page).toHaveURL(`/dashboard/${club.id}`)

  // --- closing: the cash-up matches the walk-in paid in cash ---
  await page.goto(`/dashboard/${club.id}/cash-up`)
  await expect(page.getByText("Total (LAK)").locator("..")).toContainText(
    "₭150,000",
  )
  await expect(page.locator("li", { hasText: "Kham Walk-in" })).toContainText(
    "Cash",
  )
  const [csv] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ])
  expect(csv.suggestedFilename()).toMatch(/^cash-up_\d{4}-\d{2}-\d{2}\.csv$/)

  // --- the manager reads this month's money ---
  // the counter tablet changes hands: log out first, then the manager logs in
  await logOut(page)
  await signInAs(page, manager)
  await page.goto(`/dashboard/${club.id}/reports?tab=money`)
  await expect(
    page.getByText("Paid", { exact: true }).first().locator(".."),
  ).toContainText("₭150,000")
  await expect(
    page.getByText("Lost to no-shows", { exact: true }).locator(".."),
  ).toContainText("₭150,000")
  await expect(page.getByText("Booked and paid per day (LAK)")).toBeVisible()
})

// A number on the Bookings menu says how many bookings wait for approval, so the team notices them
test("the Bookings menu counts the bookings waiting for approval", async ({
  page,
}) => {
  const owner = JSON.parse(process.env.E2E_OWNER!) as Session
  const token = owner.access_token
  const own = await publishedClub(owner, `E2E Approve ${Date.now()}`)

  // approval on: a customer's booking is a request until the team confirms it
  const settings = await call<Record<string, unknown>>(
    `/branches/${own.id}/settings`,
    { token },
  )
  await call(`/branches/${own.id}/settings`, {
    method: "PUT",
    token,
    body: { ...settings, require_approval: true },
  })
  const courts = await call<Array<{ id: number; name: string }>>(
    `/public/branches/${own.slug}/resources`,
  )
  const day = new Date(Date.now() + 5 * 86_400_000).toLocaleDateString(
    "en-CA",
    {
      timeZone: "Asia/Vientiane",
    },
  )
  const booked = await call<{ id: number; status: string }>(
    `/public/branches/${own.slug}/bookings`,
    {
      method: "POST",
      body: {
        resource_id: courts[0].id,
        starts_at: `${day}T10:00:00+07:00`,
        duration_min: 60,
        guest: { name: "Waiting Guest", phone: "020 5555 0101" },
      },
    },
  )
  expect(booked.status).toBe("pending")

  await signInAs(page, owner)
  await page.goto(`/dashboard/${own.id}`)
  await page.getByRole("button", { name: "Menu" }).click()
  const bookings = page.getByRole("dialog").getByRole("link", {
    name: /^Bookings/,
  })
  await expect(bookings).toContainText("1")
  await expect(
    bookings.getByLabel("1 booking waiting for approval"),
  ).toBeVisible()

  // confirmed: the number goes away
  await call(`/branches/${own.id}/bookings/${booked.id}/status`, {
    method: "POST",
    token,
    body: { status: "confirmed", reason: "" },
  })
  await page.reload()
  await page.getByRole("button", { name: "Menu" }).click()
  await expect(
    page.getByRole("dialog").getByRole("link", { name: /^Bookings/ }),
  ).not.toContainText("1")
})
