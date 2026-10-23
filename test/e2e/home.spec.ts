import { expect, test } from "@playwright/test"

import {
  atLeastLiveBranches,
  call,
  publishedClub,
  signInAs,
  type Club,
  type Session,
} from "./helpers"

// Phase 3 "Done when": a guest on a phone opens the brand home, picks a branch and books; a
// customer sees bookings from two branches in My bookings.
// The shared test branch (global-setup) has Tennis and Boxing and is in Luang Prabang; every run
// adds branches to the same database, so the home always has enough of them to show its filters.

const club = (): Club => JSON.parse(process.env.E2E_CLUB!) as Club
const owner = (): Session => JSON.parse(process.env.E2E_OWNER!) as Session
const customer = (): Session => JSON.parse(process.env.E2E_CUSTOMER!) as Session

test("a guest opens the brand home, picks a branch and books", async ({
  page,
}, info) => {
  const { name, slug } = club()
  // the search and filters appear from 5 live branches
  await atLeastLiveBranches(owner(), 5)
  const company = await call<{ name: string }>("/public/company")
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    company.name,
  )
  await expect(
    page.getByRole("heading", { name: "Our branches" }),
  ).toBeVisible()

  // a tap anywhere on a public page sparks (a short-lived canvas over the page)
  await page.getByRole("heading", { name: "Our branches" }).click()
  await expect(page.locator("canvas[aria-hidden=true]").first()).toBeAttached()

  // filters: only the sports and provinces the branches have
  await page.getByRole("button", { name: "Boxing", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Boxing", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
  await page.getByLabel("Search branches").fill(name)

  const card = page.getByRole("link", { name: new RegExp(name) })
  await expect(card).toHaveCount(1)
  await expect(card).toContainText("Tennis")
  await expect(card).toContainText("Luang Prabang")
  await expect(card).toContainText(/from ₭[\d,]+ \/ hour/)
  await expect(page).toHaveURL(/sport=boxing/)

  await card.click()
  await expect(page).toHaveURL(`/b/${slug}`)
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name)
  // the branch page says which branch this is and lets the customer switch
  await expect(page.getByText("Branch", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Choose a branch" }).click()
  const sheet = page.getByRole("dialog", { name: "Choose a branch" })
  await expect(sheet).toContainText(company.name)
  await expect(sheet).toContainText(`${name}You are here`)
  await expect(
    sheet.getByRole("link", { name: "See all branches" }),
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(sheet).toBeHidden()

  await page.getByRole("radio", { name: /Court 1/ }).click()
  await page
    .getByRole("radiogroup", { name: "Day" })
    .getByRole("radio")
    // phone and tablet share the club: one day each so the bookings do not clash
    .nth(info.project.name === "phone" ? 5 : 6)
    .click()
  // the list is redrawn when the day's times arrive: try again until the pick holds
  const last = page
    .getByRole("radiogroup", { name: "Start time" })
    .getByRole("radio")
    .last()
  await expect(async () => {
    await last.click({ timeout: 2000 })
    await expect(last).toHaveAttribute("aria-checked", "true", {
      timeout: 1000,
    })
  }).toPass()
  await page.getByRole("button", { name: "Book", exact: true }).click()
  await page.getByLabel("Full name").fill("Home Guest")
  await page.getByLabel("Phone").fill("020 5555 7788")
  await page.getByRole("button", { name: "Confirm booking" }).click()
  await expect(
    page.getByRole("heading", { name: "You're booked" }),
  ).toBeVisible()

  // Back to the home: the filters are still in the address
  await page.goto(`/b/${slug}`)
  await page.getByRole("link", { name: "All branches" }).click()
  await expect(page).toHaveURL("/")
})

test("a customer sees bookings from two branches in My bookings", async ({
  page,
}, info) => {
  const first = club()
  const second = await publishedClub(owner(), `E2E Riverside ${Date.now()}`)
  const token = customer().access_token
  const day = new Date(Date.now() + 4 * 86_400_000).toLocaleDateString(
    "en-CA",
    { timeZone: "Asia/Vientiane" },
  )
  // phone and tablet share the first branch: each books its own hour there
  const hour = info.project.name === "phone" ? "06" : "10"
  for (const branch of [first, second]) {
    const courts = await call<Array<{ id: number; name: string }>>(
      `/public/branches/${branch.slug}/resources`,
    )
    await call(`/public/branches/${branch.slug}/bookings`, {
      method: "POST",
      token,
      body: {
        resource_id: courts.find((c) => c.name === "Court 1")!.id,
        starts_at: `${day}T${hour}:00:00+07:00`,
        duration_min: 60,
      },
    })
  }

  await signInAs(page, customer())
  await page.goto("/account")
  const cards = page.locator("article")
  await expect(cards.filter({ hasText: first.name })).not.toHaveCount(0)
  await expect(cards.filter({ hasText: second.name })).toHaveCount(1)

  // one branch at a time
  const filter = page.getByRole("group", { name: "Branch" })
  await filter.getByRole("button", { name: second.name }).click()
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText(second.name)
  await filter.getByRole("button", { name: "All branches" }).click()
  await expect(cards.filter({ hasText: first.name })).not.toHaveCount(0)

  // tablets and phones: the Gooey Nav at the bottom, My bookings active (no Home: All branches is in the avatar menu)
  const width = page.viewportSize()?.width ?? 0
  if (width < 1024) {
    const nav = page.getByRole("navigation").last()
    await expect(nav.getByRole("button")).toHaveText([
      "My bookings",
      "My account",
    ])
    await expect(
      nav.getByRole("button", { name: "My bookings" }),
    ).toHaveAttribute("aria-current", "page")
    await nav.getByRole("button", { name: "My account" }).click()
    await expect(page).toHaveURL("/account/profile")
  }

  // no branch visited yet: the arrow leads to all branches, and the avatar menu has them too
  const top = page.getByRole("banner")
  await expect(
    top.getByRole("link", { name: "Back to All branches" }),
  ).toBeVisible()
  await top.getByRole("button", { name: "My account" }).click()
  await expect(
    page.getByRole("menuitem", { name: "All branches" }),
  ).toBeVisible()
  await page.keyboard.press("Escape")

  // came from a branch (a scanned QR code or a link): My bookings and My account lead back to it
  await page.goto(`/b/${first.slug}`)
  await page.getByRole("link", { name: "My bookings" }).click()
  await expect(page).toHaveURL("/account")
  await top.getByRole("link", { name: `Back to ${first.name}` }).click()
  await expect(page).toHaveURL(`/b/${first.slug}`)
  await page.goto("/")
  await expect(page.getByRole("link", { name: /My bookings/ })).toBeVisible()
  await expect(
    page.getByRole("link", { name: new RegExp(second.name) }),
  ).toBeVisible()
})
