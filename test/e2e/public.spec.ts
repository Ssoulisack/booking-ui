import { expect, test, type Page } from "@playwright/test"

import { holdButton, signInAs, type Club } from "./helpers"

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
  // the list is redrawn when the day's times arrive: try again until the pick holds
  await expect(async () => {
    await first.click({ timeout: 2000 })
    await expect(first).toHaveAttribute("aria-checked", "true", {
      timeout: 1000,
    })
  }).toPass()
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
  // a quick tap does nothing: cancelling needs a press and hold
  const hold = page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Hold to cancel" })
  await hold.click()
  await expect(page.getByText("Booking cancelled.")).toHaveCount(0)
  await holdButton(page, hold)
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
  await holdButton(
    page,
    page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Hold to cancel" }),
  )
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

test("More dates opens a calendar in the middle of the screen", async ({
  page,
}) => {
  await page.goto(`/b/${club.slug}`)
  await page.getByRole("button", { name: "More dates" }).click()
  const dialog = page.getByRole("dialog", { name: "Pick a date" })
  await expect(dialog).toBeVisible()

  // centred on the screen, whatever its size
  const box = (await dialog.boundingBox())!
  const view = page.viewportSize()!
  expect(Math.abs(box.x + box.width / 2 - view.width / 2)).toBeLessThan(4)
  expect(Math.abs(box.y + box.height / 2 - view.height / 2)).toBeLessThan(4)

  // a day after the 14 in the strip: the dialog closes and the date is shown under the strip
  const day = new Date(Date.now() + 20 * 86_400_000)
  if (day.getMonth() !== new Date().getMonth())
    await dialog.getByRole("button", { name: /next month/i }).click()
  const month = day.toLocaleDateString("en-US", { month: "long" })
  await dialog
    .getByRole("button", {
      name: new RegExp(`${month} ${day.getDate()}(st|nd|rd|th),`),
    })
    .click()
  await expect(dialog).toBeHidden()
  await expect(
    page.getByText(
      day.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    ),
  ).toBeVisible()
})

test("classes can be picked beyond the 30-day rule that limits courts", async ({
  page,
}) => {
  const far = new Date(Date.now() + 40 * 86_400_000)
  const label = new RegExp(
    `${far.toLocaleDateString("en-US", { month: "long" })} ${far.getDate()}(st|nd|rd|th),`,
  )
  /** opens More dates and finds the day 40 days ahead in the calendar */
  const farDay = async () => {
    await page.getByRole("button", { name: "More dates" }).click()
    const dialog = page.getByRole("dialog", { name: "Pick a date" })
    const next = dialog.getByRole("button", { name: /next month/i })
    for (let i = 0; i < 3; i++) {
      if (await dialog.getByRole("button", { name: label }).count()) break
      if (await next.isDisabled()) break // the calendar ends before that month
      await next.click()
    }
    return dialog.getByRole("button", { name: label })
  }

  await page.goto(`/b/${club.slug}`)
  // Tennis courts follow the company rule: 30 days ahead, so day 40 is out of reach
  const courtDay = await farDay()
  expect((await courtDay.count()) === 0 || (await courtDay.isDisabled())).toBe(
    true,
  )
  await page.keyboard.press("Escape")

  // group classes are not limited by it
  await page.getByRole("radio", { name: "Boxing" }).click()
  await page.getByRole("radio", { name: "Group class" }).click()
  await expect(await farDay()).toBeEnabled()
})
