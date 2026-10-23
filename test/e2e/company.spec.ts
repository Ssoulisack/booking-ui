import { expect, test, type Browser } from "@playwright/test"

import {
  answerNationality,
  atLeastBranches,
  call,
  inviteToken,
  PASSWORD,
  publishedClub,
  signInAs,
  uniqueEmail,
  type Session,
} from "./helpers"

// Phase 2 "Done when": in the browser the owner sets the brand, opens a branch and invites a
// manager, who sees only that branch and can run its desk. Also: closing a branch locks its team
// out, and a new password for a customer without email.

const owner = (): Session => JSON.parse(process.env.E2E_OWNER!) as Session

/** A second browser for another person, so the owner stays logged in */
async function otherPerson(browser: Browser, baseURL: string | undefined) {
  const ctx = await browser.newContext({ baseURL })
  return { ctx, page: await ctx.newPage() }
}

test("the owner sets the brand, opens a branch and gives it a manager", async ({
  page,
  browser,
  baseURL,
}) => {
  const branchName = `Riverside ${Date.now()}`
  const managerEmail = uniqueEmail("branch-manager")
  await signInAs(page, owner())

  // --- the brand every branch shows ---
  await page.goto("/company/settings")
  await page.getByLabel("Description").fill("Courts and classes by the river.")
  await page.getByLabel("Brand colour code").fill("#0e7c66")
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Settings saved.")).toBeVisible()
  const brand = await call<{ brand_color: string; description: string }>(
    "/public/company",
  )
  expect(brand.brand_color).toBe("#0e7c66")

  // --- a new branch: its dashboard opens to set it up ---
  await page.goto("/company/branches")
  await page.getByRole("button", { name: "New branch" }).click()
  await page.getByRole("dialog").getByLabel("Branch name").fill(branchName)
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Open branch" })
    .click()
  await expect(page).toHaveURL(/\/dashboard\/\d+$/)
  const branchId = Number(new URL(page.url()).pathname.split("/").pop())
  await expect(page.getByText(`You are Owner at ${branchName}.`)).toBeVisible()

  // --- invite a manager for this branch only (more than 6 branches: the picker has a search) ---
  await atLeastBranches(owner(), 7)
  await page.goto("/company/team")
  await page.getByRole("link", { name: /^Invite/ }).click()
  await expect(page).toHaveURL("/company/team/invite")
  await page.getByLabel("Email").fill(managerEmail)
  await page.getByRole("combobox", { name: "Role" }).click()
  await page.getByRole("option", { name: "Manager" }).click()
  // many branches: find it, tick it, and it shows as a chip that can be removed
  await page.getByLabel("Find a branch").fill(branchName)
  await page.getByRole("checkbox", { name: branchName }).check()
  const chips = page.getByRole("list", { name: "Chosen branches" })
  await expect(chips).toContainText(branchName)
  await expect(page.getByText(/^1 of \d+ chosen$/)).toBeVisible()
  // the long branch list scrolls inside its box: no empty space below the page
  const { page: height, end } = await page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    // a short page still fills the screen
    end: Math.max(
      document.querySelector("main")!.getBoundingClientRect().bottom + scrollY,
      innerHeight,
    ),
  }))
  expect(height).toBeLessThanOrEqual(Math.ceil(end) + 1)
  await page.getByRole("button", { name: "Send invitation" }).click()
  await expect(
    page.getByText(`Invitation sent to ${managerEmail}.`),
  ).toBeVisible()
  await expect(
    page.locator("li", { hasText: managerEmail }).filter({
      has: page.getByRole("button", { name: "Resend" }),
    }),
  ).toContainText(branchName)

  // --- the manager joins from the email, sees only this branch and runs its desk ---
  const manager = await otherPerson(browser, baseURL)
  await manager.page.goto(`/invite/${await inviteToken(managerEmail)}`)
  await expect(manager.page.getByText(branchName)).toBeVisible()
  await manager.page.getByLabel("Full name").fill("Mali Manager")
  await manager.page.getByLabel("Password", { exact: true }).fill(PASSWORD)
  await manager.page.getByLabel("Confirm password").fill(PASSWORD)
  await manager.page.getByRole("button", { name: /^Join / }).click()
  await answerNationality(manager.page)
  await expect(manager.page).toHaveURL(`/dashboard/${branchId}`)
  await expect(
    manager.page.getByText(`You are Manager at ${branchName}.`),
  ).toBeVisible()
  // one branch: no switcher to other branches
  await expect(
    manager.page.getByRole("button", { name: "Switch branch" }),
  ).toHaveCount(0)
  await manager.page.goto(`/dashboard/${branchId}/calendar`)
  await expect(
    manager.page.getByRole("button", { name: "New booking" }),
  ).toBeVisible()

  // --- the owner sees them in the team, with their branch ---
  await page.goto("/company/team")
  await page.getByLabel("Search people").fill(managerEmail)
  await expect(
    page.getByRole("row").filter({ hasText: managerEmail }),
  ).toContainText(branchName)

  // --- closing the branch locks its team out on the next click ---
  await page.goto("/company/branches")
  await page.getByLabel("Search branches").fill(branchName)
  const row = page.locator("li", { hasText: branchName })
  await row.getByRole("button", { name: "Close" }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Close" })
    .click()
  await expect(page.getByText("Branch closed.")).toBeVisible()
  await expect(row).toContainText("Closed")
  await manager.page.goto(`/dashboard/${branchId}`)
  await expect(manager.page).toHaveURL("/login")
  await expect(
    manager.page.getByText(
      "This branch is closed. The owner or an admin can reopen it.",
    ),
  ).toBeVisible()
  await manager.ctx.close()
})

test("the owner sets a new password for a customer without email", async ({
  page,
  browser,
  baseURL,
}) => {
  const phone = `207${String(Date.now()).slice(-7)}`
  const customer = await call<Session>("/auth/register", {
    method: "POST",
    body: { name: "Phone Only", nationality: "LA", phone, password: PASSWORD },
  })

  await signInAs(page, owner())
  await page.goto("/company/users")
  // found by the phone written the old way
  await page
    .getByLabel("Search")
    .fill(`0${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6)}`)
  await page.getByLabel("Search").press("Enter")
  const row = page.getByRole("listitem").filter({ hasText: "Phone Only" })
  await expect(row).toHaveCount(1)
  await expect(row).toContainText(`${phone} · no email · LA`)

  // tokens carry whole seconds: make the customer's login clearly older than the new password
  await page.waitForTimeout(1100)
  await row.getByRole("button", { name: "Set new password" }).click()
  await page.getByRole("button", { name: "Set password" }).click()
  const password = (await page.getByTestId("new-password").textContent())!
  await page.getByRole("button", { name: "Done" }).click()

  // the old login ended; the new password works with the phone
  await expect(
    call("/auth/me", { token: customer.access_token }),
  ).rejects.toThrow(/401/)
  const person = await otherPerson(browser, baseURL)
  await person.page.goto("/login")
  await person.page.getByLabel("Email or phone").fill(phone)
  await person.page.getByLabel("Password").fill(password)
  await person.page.getByRole("button", { name: "Log in" }).click()
  await expect(person.page).toHaveURL("/")
  await person.ctx.close()
})

// Phase 3: QR codes for the brand home and for each live branch
test("the owner finds the QR codes of the home and of a branch", async ({
  page,
  baseURL,
}) => {
  const club = JSON.parse(process.env.E2E_CLUB!) as {
    name: string
    slug: string
  }
  await signInAs(page, owner())

  await page.goto("/company")
  const home = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Your booking site" }),
  })
  await expect(home.getByText(`${baseURL}/`, { exact: true })).toBeVisible()
  await expect(home.getByRole("img", { name: /QR code/ })).toBeVisible()
  await expect(home.getByRole("link", { name: "Download QR" })).toHaveAttribute(
    "download",
    "home-qr.png",
  )

  await atLeastBranches(owner(), 21)
  await page.goto("/company/branches")
  // more than 20 branches: the list is split into pages of 20
  await expect(page.getByText(/^Page 1 of \d+$/)).toBeVisible()
  await expect(page.getByRole("button", { name: "QR code" })).not.toHaveCount(0)
  // (ul: the breadcrumb trail is an ol)
  expect(await page.locator("main ul > li").count()).toBeLessThanOrEqual(20)
  await page.getByLabel("Search branches").fill(club.name)
  await page
    .getByRole("listitem")
    .filter({ hasText: club.name })
    .getByRole("button", { name: "QR code" })
    .click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText(`${baseURL}/b/${club.slug}`)).toBeVisible()
  await expect(
    dialog.getByRole("link", { name: "Download QR" }),
  ).toHaveAttribute("download", `${club.slug}-qr.png`)
})

// 2f: a branch is cloned from its row, or from "Start from a branch" in New branch; the copy is
// named NAME-COPY, then NAME-COPY-1, -2 …; the setup comes along and the copy is a draft
test("the owner clones a branch from its row and from the New branch dialog", async ({
  page,
}) => {
  // its own branch: phone and tablet each clone one, so the names stay predictable
  const club = await publishedClub(owner(), `E2E Source ${Date.now()}`)
  await signInAs(page, owner())

  // --- the row's Clone button ---
  await page.goto(`/company/branches?q=${encodeURIComponent(club.name)}`)
  const row = page.getByRole("listitem").filter({ hasText: club.name })
  await row.getByRole("button", { name: "Clone" }).click()
  const dialog = page.getByRole("dialog", { name: `Clone ${club.name}` })
  await expect(dialog.getByLabel("Branch name")).toHaveValue(
    `${club.name}-COPY`,
  )
  await expect(dialog).toContainText("Not copied: bookings")
  await dialog.getByRole("button", { name: "Clone branch" }).click()
  await expect(page).toHaveURL(/\/dashboard\/\d+$/)
  await expect(page.getByText(`${club.name}-COPY`).first()).toBeVisible()

  // the copy has the setup: a space of the original
  await page.goto(`${new URL(page.url()).pathname}/setup/spaces`)
  await expect(page.getByText("Court 1").first()).toBeVisible()

  // --- "Start from a branch" in New branch: the next free name is -COPY-1 ---
  await page.goto("/company/branches")
  await page.getByRole("button", { name: "New branch" }).click()
  const fresh = page.getByRole("dialog", { name: "New branch" })
  await fresh.getByLabel("Start from a branch (optional)").selectOption({
    label: club.name,
  })
  await expect(fresh.getByLabel("Branch name")).toHaveValue(
    `${club.name}-COPY-1`,
  )
  // a name of their own wins over the suggestion
  await fresh.getByLabel("Branch name").fill(`${club.name} Annex`)
  await fresh.getByRole("button", { name: "Clone branch" }).click()
  await expect(page).toHaveURL(/\/dashboard\/\d+$/)
  await expect(page.getByText(`${club.name} Annex`).first()).toBeVisible()
})

// 2g: ring colours (up to 4) and fonts for the whole company, a branch's own look, and a preview of
// what is not saved yet
test("the owner sets the look, sees it live before saving, and a branch can have its own", async ({
  page,
}) => {
  await signInAs(page, owner())
  await page.goto("/company/settings")
  const panel = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Look of the pages" }),
  })
  await panel.getByRole("button", { name: "Add colour" }).click()
  await panel.getByRole("button", { name: "Add colour" }).click()
  await panel.getByLabel("Ring colour 1 code").fill("#ff0000")
  await panel.getByLabel("Ring colour 2 code").fill("#0000ff")
  await panel.getByLabel("Heading font").selectOption("kanit")
  await panel.getByLabel("Text font").selectOption("inter")

  // --- the live preview beside the form follows the choices; nothing is saved yet ---
  const preview = panel.getByRole("region", { name: "Live preview" })
  await expect(preview).toHaveAttribute("style", /Kanit/)
  await expect(preview).toHaveAttribute("style", /Inter/)
  const saved = await call<{ heading_font: string; ring_colors: string[] }>(
    "/public/company",
  )
  expect(saved.ring_colors).not.toContain("#ff0000")

  // --- save: the public home now carries it ---
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Settings saved.")).toBeVisible()
  const after = await call<{ heading_font: string; ring_colors: string[] }>(
    "/public/company",
  )
  expect(after.heading_font).toBe("kanit")
  expect(after.ring_colors).toEqual(["#ff0000", "#0000ff"])

  // --- a branch can follow the company, or have its own fonts and colours ---
  const club = await publishedClub(owner(), `E2E Look ${Date.now()}`)
  await page.goto(`/dashboard/${club.id}/settings`)
  await page.locator("#o-body-font").click()
  await page.getByLabel("Text font").selectOption("poppins")
  await page.locator("#o-rings").click()
  await page.getByRole("button", { name: "Use the brand colour" }).click()
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Settings saved.")).toBeVisible()
  await page.goto(`/b/${club.slug}`)
  const wrapper = page.locator("[style*='--brand-heading-font']").first()
  await expect(wrapper).toHaveAttribute("style", /Poppins/)
  await expect(wrapper).toHaveAttribute("style", /Kanit/)

  // leave the company as found for the other specs
  await page.goto("/company/settings")
  await panel.getByRole("button", { name: "Use the brand colour" }).click()
  await panel.getByLabel("Heading font").selectOption("noto-condensed")
  await panel.getByLabel("Text font").selectOption("noto-sans")
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Settings saved.")).toBeVisible()
})

// 2b: the owner finds an employee by name, ID, phone or email, and by branch
test("the owner finds an employee by name, employee no., phone, email, branch, role and access", async ({
  page,
}) => {
  const club = JSON.parse(process.env.E2E_CLUB!) as { id: number; name: string }
  const other = await publishedClub(owner(), `E2E Lakeside ${Date.now()}`)
  const stamp = Date.now()
  const name = `Kham Staff ${stamp}`
  const email = uniqueEmail("kham")
  const phone = `20${String(stamp).slice(-8)}`
  await call("/company/invitations", {
    method: "POST",
    token: owner().access_token,
    body: { email, role: "staff", branch_ids: [club.id] },
  })
  const kham = await call<
    Session & { user: { id: number; member_no: string } }
  >(`/invitations/${await inviteToken(email)}/accept`, {
    method: "POST",
    body: { name, password: PASSWORD },
  })
  await call("/auth/me", {
    method: "PUT",
    token: kham.access_token,
    body: { name, nationality: "LA", email, phone },
  })

  await signInAs(page, owner())
  await page.goto("/company/team")
  const search = page.getByLabel("Search people")
  const row = page.getByRole("row").filter({ hasText: name })

  for (const q of [
    name.toLowerCase(),
    kham.user.member_no,
    `0${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6)}`,
    email,
  ]) {
    await search.fill(q)
    await expect(row).toHaveCount(1)
  }
  expect(kham.user.member_no).toMatch(/^ENO\d{6,}$/)
  await expect(row).toContainText(kham.user.member_no)
  await expect(row).toContainText(club.name)

  // the branch picker: Kham works only at the shared branch
  await search.fill(name)
  await page
    .getByLabel("Branch", { exact: true })
    .selectOption({ label: other.name })
  await expect(row).toHaveCount(0)
  await expect(page.getByText("Nobody matches.")).toBeVisible()
  await page
    .getByLabel("Branch", { exact: true })
    .selectOption({ label: club.name })
  await expect(row).toHaveCount(1)
  await expect(page).toHaveURL(new RegExp(`branch=${club.id}`))

  // the role picker: Kham is staff, not a manager
  await page.getByLabel("Role", { exact: true }).selectOption("manager")
  await expect(row).toHaveCount(0)
  await page.getByLabel("Role", { exact: true }).selectOption("staff")
  await expect(row).toHaveCount(1)
  await expect(page).toHaveURL(/role=staff/)

  // the access picker: Kham's access is on
  await page.getByLabel("Access", { exact: true }).selectOption("off")
  await expect(row).toHaveCount(0)
  await page.getByLabel("Access", { exact: true }).selectOption("on")
  await expect(row).toHaveCount(1)
  await expect(row).toContainText("On")
})
