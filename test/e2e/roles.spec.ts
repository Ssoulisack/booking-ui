import { expect, test } from "@playwright/test"

import {
  answerNationality,
  call,
  inviteToken,
  logIn,
  menuLinks,
  OWNER,
  PASSWORD,
  uniqueEmail,
  type Session,
} from "./helpers"

// Each role logs in and lands in the right area; someone switched off is sent back to login.
// Login is rate limited (10 per 15 min per IP); this file uses 5, plus 1 in global-setup.

interface Auth {
  access_token: string
  user: { id: number }
}

const run = Date.now()
const branchName = `E2E Branch ${run}`
const people = {
  manager: { email: uniqueEmail("manager"), name: "Max Manager" },
  staff: { email: uniqueEmail("staff"), name: "Sam Staff" },
  customer: { email: uniqueEmail("customer"), name: "Cara Customer" },
}

let owner: Session
let branchId = 0
const userIds: Record<string, number> = {}

test.describe.serial("roles land in the right area", () => {
  test.beforeAll(async () => {
    owner = JSON.parse(process.env.E2E_OWNER!) as Session // logged in once by global-setup.ts
    const branch = await call<{ id: number }>("/company/branches", {
      method: "POST",
      token: owner.access_token,
      body: { name: branchName },
    })
    branchId = branch.id
    // the owner invites a manager and a staff member for this branch; they accept by email
    for (const role of ["manager", "staff"] as const) {
      await call("/company/invitations", {
        method: "POST",
        token: owner.access_token,
        body: { email: people[role].email, role, branch_ids: [branchId] },
      })
      const accepted = await call<Auth>(
        `/invitations/${await inviteToken(people[role].email)}/accept`,
        {
          method: "POST",
          body: { name: people[role].name, password: PASSWORD },
        },
      )
      userIds[role] = accepted.user.id
    }
  })

  test("the owner lands in the company area and can open any branch", async ({
    page,
  }) => {
    await logIn(page, OWNER.login, OWNER.password)
    await expect(page).toHaveURL("/company")
    expect(await menuLinks(page)).toEqual(
      expect.arrayContaining([
        "Overview",
        "Branches",
        "Employees",
        "Reports",
        "Company settings",
      ]),
    )
    await page.goto(`/dashboard/${branchId}`)
    await expect(
      page.getByText(`You are Owner at ${branchName}.`),
    ).toBeVisible()
    expect(await menuLinks(page)).toEqual(
      expect.arrayContaining(["Setup", "Branch settings"]),
    )
    // the trail starts at the company, then the branch
    const trail = page.getByRole("navigation", { name: "Breadcrumb" })
    await expect(trail.getByRole("link", { name: "Company" })).toBeVisible()
    await expect(trail).toContainText(branchName)

    // "Work in": Company or Branch, above the menu
    await page.getByRole("button", { name: "Menu" }).click()
    const menu = page.getByRole("dialog")
    await expect(menu.getByRole("radio", { name: "Branch" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    await menu.getByRole("radio", { name: "Company" }).click()
    await expect(page).toHaveURL("/company")

    // a deeper page: every step back is a link
    await page.goto("/company/team/invite")
    await expect(trail.locator("[aria-current=page]")).toHaveText("Invite")
    await trail.getByRole("link", { name: "Employees" }).click()
    await expect(page).toHaveURL("/company/team")
  })

  test("a manager sees their branch's setup and reports, not its settings or the company", async ({
    page,
  }) => {
    await logIn(page, people.manager.email)
    await answerNationality(page) // invited accounts are asked once
    await expect(page).toHaveURL(`/dashboard/${branchId}`)
    await expect(
      page.getByText(`You are Manager at ${branchName}.`),
    ).toBeVisible()

    const links = await menuLinks(page)
    expect(links).toEqual(
      expect.arrayContaining(["Calendar", "Setup", "Reports"]),
    )
    expect(links).not.toContain("Branch settings")
    // no Company / Branch choice: the trail starts at their branch
    await page.getByRole("button", { name: "Menu" }).click()
    await expect(page.getByRole("dialog").getByRole("radio")).toHaveCount(0)
    await page.keyboard.press("Escape")
    await page.goto(`/dashboard/${branchId}/bookings`)
    const trail = page.getByRole("navigation", { name: "Breadcrumb" })
    await expect(trail.getByRole("link", { name: branchName })).toBeVisible()
    await expect(trail.locator("[aria-current=page]")).toHaveText("Bookings")

    // pages above the role are closed even by typing the address
    await page.goto(`/dashboard/${branchId}/settings`)
    await expect(page).toHaveURL(`/dashboard/${branchId}`)
    await page.goto("/company")
    await expect(page).toHaveURL(`/dashboard/${branchId}`)
  })

  test("a customer who registers lands on the home page", async ({ page }) => {
    await page.goto("/register")
    await page.getByLabel("Full name").fill(people.customer.name)
    await page.getByLabel("Nationality").selectOption("TH")
    await page.getByLabel("Email", { exact: true }).fill(people.customer.email)
    await page.getByLabel("Password").fill(PASSWORD)
    await page.getByRole("button", { name: "Create account" }).click()
    await expect(page).toHaveURL("/")

    // customers cannot open the dashboard or the company area
    await page.goto("/dashboard")
    await expect(page).toHaveURL("/")
    await page.goto("/company")
    await expect(page).toHaveURL("/")
  })

  test("a staff member switched off is sent back to login", async ({
    page,
  }) => {
    await logIn(page, people.staff.email)
    await answerNationality(page)
    await expect(page).toHaveURL(`/dashboard/${branchId}`)
    await expect(
      page.getByText(`You are Staff at ${branchName}.`),
    ).toBeVisible()
    const links = await menuLinks(page)
    expect(links).toEqual(
      expect.arrayContaining(["Calendar", "Bookings", "Customers"]),
    )
    expect(links).not.toContain("Setup")

    await call(`/company/team/${userIds.staff}`, {
      method: "PUT",
      token: owner.access_token,
      body: { role: "staff", branch_ids: [branchId], active: false },
    })

    // the next click notices
    await page.getByRole("button", { name: "Menu" }).click()
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Calendar" })
      .click()
    await expect(page).toHaveURL("/login")
    await expect(page.getByText("You have been logged out")).toBeVisible()
    await expect(
      page.getByText(
        "Your access to this branch has been switched off. Ask the owner or an admin.",
      ),
    ).toBeVisible()

    // the same login still works as a customer
    await logIn(page, people.staff.email)
    await expect(page).toHaveURL("/")
  })

  test("a disabled account is logged out on the next click", async ({
    page,
  }) => {
    await logIn(page, people.manager.email)
    await expect(page).toHaveURL(`/dashboard/${branchId}`)

    await call(`/company/users/${userIds.manager}/status`, {
      method: "PATCH",
      token: owner.access_token,
      body: { status: false },
    })

    // the next click logs them out — unless a background refresh notices first, which is fine too
    try {
      await page.getByRole("button", { name: "Menu" }).click({ timeout: 3000 })
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "Setup" })
        .click({ timeout: 3000 })
    } catch {
      // already logged out by a background request
    }
    await expect(page).toHaveURL("/login")
    await expect(
      page.getByText("This account has been switched off. Please contact us."),
    ).toBeVisible()
  })
})
