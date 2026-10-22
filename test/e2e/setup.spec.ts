import { expect, test } from "@playwright/test"

import { call, signInAs, type Club, type Session } from "./helpers"

// A new branch goes from "New branch" to a published booking page using only the screens.

test("the owner opens a branch, sets it up and publishes it", async ({
  page,
}) => {
  const owner = JSON.parse(process.env.E2E_OWNER!) as Session
  await signInAs(page, owner)
  const name = `Setup Club ${Date.now()}`

  // 1. Company › Branches › New branch → its dashboard
  await page.goto("/company/branches")
  await page.getByRole("button", { name: "New branch" }).click()
  await page.getByRole("dialog").getByLabel("Branch name").fill(name)
  const slug = await page
    .getByRole("dialog")
    .getByLabel("Web address")
    .inputValue()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Open branch" })
    .click()
  await expect(page).toHaveURL(/\/dashboard\/\d+$/)
  const home = new URL(page.url()).pathname
  await expect(page.getByText("Get your booking page live")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Publish booking page" }),
  ).toBeDisabled()

  // 2. the branch's own details
  await page
    .getByRole("link", { name: /Add the branch's address and description/ })
    .click()
  await page.getByLabel("Description").fill("Two clay courts by the Mekong.")
  await page.getByLabel("Address", { exact: true }).fill("Ban Wat Chan")
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Settings saved.")).toBeVisible()

  // 3. a sport
  await page.goto(home)
  await page.getByRole("link", { name: /Add a sport/ }).click()
  await page.getByRole("button", { name: "Add sport" }).first().click()
  await page.getByRole("dialog").getByLabel("Name").fill("Tennis")
  // the type is required: customers filter places by it
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Choose the type of sport.")).toBeVisible()
  await page.getByRole("combobox", { name: "Type of sport" }).click()
  await page.getByRole("option", { name: "Tennis", exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click()
  await expect(page.getByRole("dialog")).toBeHidden()
  // the row shows the name and the type (both "Tennis" here)
  await expect(page.getByText("Tennis", { exact: true })).toHaveCount(2)

  // 4. a space (a court), then its opening hours and price
  await page.getByRole("link", { name: "Spaces", exact: true }).click()
  await expect(page).toHaveURL(/\/setup\/spaces$/)
  await page.getByRole("button", { name: "Add space" }).first().click()
  await page.getByRole("dialog").getByLabel("Name").fill("Court A")
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click()
  await expect(page.getByRole("dialog")).toBeHidden()
  await expect(page.getByText("No opening hours")).toBeVisible()
  await expect(page.getByText("No price")).toBeVisible()

  await page
    .getByRole("link", { name: /Court A/ })
    .first()
    .click()
  await page.getByRole("switch", { name: "Monday" }).click()
  await page.getByRole("button", { name: "Copy Monday to every day" }).click()
  await page.getByRole("button", { name: "Save opening hours" }).click()
  await expect(page.getByText("Opening hours saved.")).toBeVisible()
  await page.getByLabel("Price per hour (LAK)").fill("120000")
  // what each bookable length costs, from the company rule (1 h to 3 h in steps of 30 min)
  await expect(
    page.getByText(
      "1 h = ₭120,000 · 1 h 30 min = ₭180,000 · 2 h = ₭240,000 · … · 3 h = ₭360,000",
    ),
  ).toBeVisible()
  await page.getByRole("button", { name: "Save price" }).click()
  await expect(page.getByText("Price saved.")).toBeVisible()

  // 5. every step done → publish → the link to share
  await page.goto(home)
  const publish = page.getByRole("button", { name: "Publish booking page" })
  await expect(publish).toBeEnabled()
  await publish.click()
  await expect(
    page.getByRole("heading", { name: "Your booking page is live" }),
  ).toBeVisible()
  // (the address is also on the hidden print poster)
  await expect(page.getByText(`/b/${slug}`).first()).toBeVisible()

  // the QR code of the link, to download or print, and ready-made links for chat apps
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible()
  await expect(page.getByRole("link", { name: "Download QR" })).toHaveAttribute(
    "download",
    `${slug}-qr.png`,
  )
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
    "href",
    new RegExp(encodeURIComponent(`/b/${slug}`)),
  )

  // 6. customers see it
  await page.goto(`/b/${slug}`)
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name)
  await expect(page.getByRole("radio", { name: /Court A/ })).toContainText(
    "₭120,000 / hour",
  )
})

test("the owner adds a coach, a class timetable, a closed day and a sport rule", async ({
  page,
}) => {
  const club = JSON.parse(process.env.E2E_CLUB!) as Club
  await signInAs(page, club.owner)
  const setup = `/dashboard/${club.id}/setup`

  // a coach: saved, then flagged until it has hours and a price
  await page.goto(`${setup}/coaches`)
  await page.getByRole("button", { name: "Add coach" }).first().click()
  const coachName = `Coach ${Date.now()}`
  await page.getByRole("dialog").getByLabel("Name").fill(coachName)
  await page
    .getByRole("dialog")
    .getByRole("checkbox", { name: "Tennis" })
    .check()
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click()
  await expect(page.getByRole("dialog")).toBeHidden()
  await expect(page.locator("li", { hasText: coachName })).toContainText(
    "No opening hours",
  )

  // a weekly class: Monday to Saturday, no end; its classes are made 60 days ahead
  await page.getByRole("link", { name: "Classes", exact: true }).click()
  await page.getByRole("button", { name: "Weekly class" }).click()
  const weeklyDialog = page.getByRole("dialog")
  await weeklyDialog.getByLabel("Title").fill("Junior tennis")
  await expect(
    weeklyDialog.getByRole("checkbox", { name: "No end" }),
  ).toBeChecked()
  await weeklyDialog.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText(/classes created/)).toBeVisible()
  const weekly = page.locator("section", {
    has: page.getByRole("heading", { name: "Weekly classes" }),
  })
  await expect(weekly).toContainText("Junior tennis")
  await expect(weekly).toContainText("Mon–Sat 18:00–19:00")
  await expect(weekly).toContainText("no end")
  await expect(
    page
      .locator("li", { hasText: "Junior tennis" })
      .filter({ hasText: "Weekly" })
      .first(),
  ).toBeVisible()

  // a closed day for the whole venue
  await page.getByRole("link", { name: "Closed days", exact: true }).click()
  await page.getByRole("button", { name: "Add closed time" }).click()
  // three weeks ahead or later (the club is shared, and a closure today would block the desk
  // test): the first day that is not a Sunday (no weekly class) and not closed already
  const closures = await call<Array<{ starts_at: string }>>(
    `/branches/${club.id}/closures?limit=100`,
    { token: club.ownerToken },
  )
  const closedDays = new Set(
    closures.map((c) =>
      new Date(c.starts_at).toLocaleDateString("en-CA", {
        timeZone: "Asia/Vientiane",
      }),
    ),
  )
  let later = ""
  for (let ahead = 21; !later; ahead++) {
    const day = new Date(Date.now() + ahead * 86_400_000)
    const ymd = day.toLocaleDateString("en-CA", { timeZone: "Asia/Vientiane" })
    if (new Date(`${ymd}T12:00:00`).getDay() !== 0 && !closedDays.has(ymd))
      later = ymd
  }
  await page.getByRole("dialog").getByLabel("From").fill(later)
  await page.getByRole("dialog").getByLabel("To").fill(later)
  await page
    .getByRole("dialog")
    .getByLabel("Reason (optional)")
    .fill("Court repairs")
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Court repairs").first()).toBeVisible()
  // the weekly class that day had no bookings, so it was removed
  await expect(
    page.getByText("1 weekly class without bookings was removed."),
  ).toBeVisible()

  // tennis bookings up to 2 hours: the rule in force follows
  await page.getByRole("link", { name: "Booking rules", exact: true }).click()
  const tennis = page.locator("section", {
    has: page.getByRole("heading", { name: "Tennis" }),
  })
  await tennis.getByLabel("Longest booking").fill("120")
  await tennis.getByRole("button", { name: "Save rules" }).click()
  await expect(tennis.getByText("1 h to 2 h, in steps of 30 min")).toBeVisible()

  // stop the weekly class: its upcoming classes go (none had bookings)
  await page.getByRole("link", { name: "Classes", exact: true }).click()
  await weekly.getByRole("button", { name: "Stop" }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Stop" })
    .click()
  await expect(page.getByText(/^Stopped\. \d+ upcoming class/)).toBeVisible()
  await expect(weekly).toHaveCount(0)
})
