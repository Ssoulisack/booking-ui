import { expect, test, type Page } from "@playwright/test"

import { signInAs, type Club } from "./helpers"

// 6b "Done when": on a phone-sized screen (and a tablet), a customer and a guest each book and
// cancel end to end; a group class shows the seats left.

// made once per run by global-setup.ts
const club = JSON.parse(process.env.E2E_CLUB!) as Club

/** Day `n` of the strip (0 = today); day 3 is far enough to cancel (24 h rule) */
async function pickDay(page: Page, n: number) {
  const day = page
    .getByRole("radiogroup", { name: "Day" })
    .getByRole("radio")
    .nth(n)
  await day.click()
  await expect(day).toHaveAttribute("aria-checked", "true")
}

async function pickFirstTime(page: Page) {
  const first = page
    .getByRole("radiogroup", { name: "Start time" })
    .getByRole("radio")
    .first()
  await first.click()
  await expect(first).toHaveAttribute("aria-checked", "true")
}

test("a customer books a court for 90 minutes and cancels it", async ({
  page,
}) => {
  // registered once per run by global-setup.ts (registration is rate limited)
  await signInAs(page, JSON.parse(process.env.E2E_CUSTOMER!))

  await page.goto(`/b/${club.slug}`)
  await expect(page.getByRole("heading", { level: 1 })).toContainText(club.name)
  await expect(page.getByRole("radio", { name: /Court 1/ })).toContainText(
    "₭150,000 / hour",
  )
  await pickDay(page, 3)
  await pickFirstTime(page)
  await page
    .getByRole("radiogroup", { name: "How long?" })
    .getByRole("radio", { name: /1 h 30 min/ })
    .click()
  await page.getByRole("button", { name: "Book", exact: true }).click()

  await expect(
    page.getByRole("heading", { name: "Confirm your booking" }),
  ).toBeVisible()
  await expect(page.getByText("Booking as Cara Customer")).toBeVisible()
  await expect(page.getByText("₭225,000")).toBeVisible() // 1.5 h × ₭150,000
  await page.getByRole("button", { name: "Confirm booking" }).click()

  await expect(
    page.getByRole("heading", { name: "You're booked" }),
  ).toBeVisible()
  const code = (await page
    .locator("p.tracking-wider")
    .first()
    .textContent())!.trim()
  expect(code).toMatch(/^[A-Z0-9]{8}$/)

  await page
    .getByRole("main")
    .getByRole("link", { name: "My bookings" })
    .click()
  await expect(page).toHaveURL("/account")
  const card = page.locator("article", { hasText: code })
  await expect(card).toContainText("Court 1")
  await expect(card).toContainText("Confirmed")
  await card.getByRole("button", { name: "Cancel booking" }).click()
  await page
    .getByRole("alertdialog")
    .getByLabel("Reason (optional)")
    .fill("Plans changed")
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel booking" })
    .click()
  await expect(page.getByText("Booking cancelled.")).toBeVisible()

  await page.getByRole("tab", { name: "Past and cancelled" }).click()
  await expect(page.locator("article", { hasText: code })).toContainText(
    "Cancelled",
  )
})

test("a guest books a court with a coach and cancels from the private link", async ({
  page,
}) => {
  await page.goto(`/b/${club.slug}`)
  await page.getByRole("radio", { name: /Court 2/ }).click()
  await page
    .getByRole("radiogroup", { name: "Add a coach (optional)" })
    .getByRole("radio", { name: "Somchai" })
    .click()
  await pickDay(page, 3)
  await pickFirstTime(page)
  await page.getByRole("button", { name: "Book", exact: true }).click()

  await expect(
    page.getByRole("heading", { name: "Confirm your booking" }),
  ).toBeVisible()
  await expect(page.getByText("Court 2 + Somchai")).toBeVisible()
  await expect(page.getByText("₭350,000")).toBeVisible() // court 150,000 + coach 200,000 for 1 h
  await page.getByRole("button", { name: "Confirm booking" }).click()
  await expect(page.getByText("This field is required.")).toBeVisible()

  await page.getByLabel("Full name").fill("Noy Guest")
  await page.getByLabel("Phone").fill("020 5555 1234")
  await page.getByRole("button", { name: "Confirm booking" }).click()

  await expect(
    page.getByRole("heading", { name: "You're booked" }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Keep this link" }),
  ).toBeVisible()
  await page.getByRole("link", { name: "Open", exact: true }).click()

  await expect(
    page.getByRole("heading", { name: "Your booking" }),
  ).toBeVisible()
  await expect(page.locator("article")).toContainText("Court 2 + Somchai")
  await page.getByRole("button", { name: "Cancel booking" }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel booking" })
    .click()
  await expect(page.locator("article")).toContainText("Cancelled")
})

test("a guest books two seats in a group class and the seats left go down", async ({
  page,
}) => {
  await page.goto(`/b/${club.slug}`)
  await page.getByRole("radio", { name: "Boxing" }).click()
  await page.getByRole("radio", { name: "Group class" }).click()
  await pickDay(page, 2)
  // phone and tablet runs share one club, so compare with the seats left before booking
  const cls = page.getByRole("radio", { name: /Morning boxing/ })
  await expect(cls).toContainText("seats left")
  const before = Number(
    (await cls.textContent())!.match(/(\d+) seats left/)![1],
  )
  await cls.click()
  await page.getByRole("button", { name: "One seat more" }).click()
  await page.getByRole("button", { name: "Book", exact: true }).click()

  await expect(page.getByText("2 seats", { exact: true })).toBeVisible()
  await expect(page.getByText("₭100,000")).toBeVisible()
  await page.getByLabel("Full name").fill("Lee Guest")
  await page.getByLabel("Phone").fill("020 5555 9876")
  await page.getByRole("button", { name: "Confirm booking" }).click()
  await expect(
    page.getByRole("heading", { name: "You're booked" }),
  ).toBeVisible()

  await page.getByRole("link", { name: "Book another time" }).click()
  await page.getByRole("radio", { name: "Boxing" }).click()
  await page.getByRole("radio", { name: "Group class" }).click()
  await pickDay(page, 2)
  await expect(
    page.getByRole("radio", { name: /Morning boxing/ }),
  ).toContainText(`${before - 2} seats left`)
})
