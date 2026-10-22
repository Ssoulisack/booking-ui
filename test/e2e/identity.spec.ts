import { expect, test } from "@playwright/test"

import {
  answerNationality,
  call,
  inviteToken,
  logIn,
  logOut,
  PASSWORD,
  setNationality,
  signInAs,
  uniqueEmail,
  type Club,
  type Session,
} from "./helpers"

// 6d.2 "Done when": a Lao customer registers with only a phone, logs in with the phone, and staff book
// for them by typing that phone; a foreign customer registers with an email; an existing account is
// asked for its nationality once. Runs on the tablet (the staff part is the counter screen).

const club = JSON.parse(process.env.E2E_CLUB!) as Club

async function invited(
  role: "staff" | "manager",
  name: string,
): Promise<Session> {
  const email = uniqueEmail(role)
  await call("/company/invitations", {
    method: "POST",
    token: club.ownerToken,
    body: { email, role, branch_ids: [club.id] },
  })
  return call<Session>(`/invitations/${await inviteToken(email)}/accept`, {
    method: "POST",
    body: { name, password: PASSWORD },
  })
}

test("Lao and foreign customers register; staff book for a Lao customer by phone", async ({
  page,
}) => {
  // a Lao mobile that no other run has used: 205 + seven digits
  const digits = String(Date.now()).slice(-7)
  const phone = `205${digits}` // the format people type and see: 20 and 8 digits

  // --- Lao customer: phone only ---
  await page.goto("/register")
  await page.getByLabel("Full name").fill("Keo Phonepaseuth")
  await page.getByLabel("Nationality").selectOption("LA")
  await expect(page.getByLabel("Email (optional)")).toBeVisible()
  await page.getByLabel("Phone").fill(phone)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL("/")

  await page.goto("/account/profile")
  const customerNo = (await page.getByText(/^CNO\d{6,}$/).textContent())!.trim()
  await expect(page.getByLabel("Email (optional)")).toHaveValue("") // the stand-in is never shown
  await logOut(page)

  // --- logs in with the phone, written the old way (020 …): accepted and converted ---
  await logIn(
    page,
    `0${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6)}`,
  )
  await expect(page).toHaveURL("/")
  await logOut(page)

  // --- foreign customer: email needed, phone optional ---
  await page.goto("/register")
  await page.getByLabel("Full name").fill("Anna Visitor")
  await page.getByLabel("Nationality").selectOption("FR")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByText("Enter your email.")).toBeVisible()
  const annaEmail = uniqueEmail("anna")
  await page.getByLabel("Email", { exact: true }).fill(annaEmail)
  await page.getByLabel("Password").fill(PASSWORD)
  // seen once in a full run: the email was empty at submit; this pins down when it happens
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(annaEmail)
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL("/")
  await logOut(page)

  // --- the desk finds Keo by phone and books for them ---
  const staff = await invited("staff", "Desk Staff")
  await setNationality(staff, "Desk Staff")
  await signInAs(page, staff)
  await page.goto(`/dashboard/${club.id}/calendar`)
  await page.getByRole("button", { name: "New booking", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("radio", { name: "Has an account" }).click()
  await dialog.getByLabel("Phone or customer number").fill(phone)
  await dialog.getByRole("button", { name: "Find" }).click()
  await expect(dialog.getByText("Keo Phonepaseuth")).toBeVisible()
  await expect(dialog.getByText(customerNo)).toBeVisible()
  const first = dialog
    .getByRole("radiogroup", { name: "Start time" })
    .getByRole("radio")
    .first()
  await first.click()
  await expect(first).toHaveAttribute("aria-checked", "true")
  await dialog.getByRole("button", { name: "Book", exact: true }).click()
  await expect(page.getByText(/^Booked: /)).toBeVisible()
  await expect(page.getByRole("dialog")).toContainText("Keo Phonepaseuth")
  await expect(page.getByRole("dialog")).toContainText(customerNo)
  await expect(page.getByRole("dialog")).toContainText(phone)
})

test("an account without a nationality is asked once", async ({ page }) => {
  const manager = await invited("manager", "Mai Manager") // invited: no nationality yet
  await signInAs(page, manager)
  await page.goto(`/dashboard/${club.id}`)
  await answerNationality(page, "LA")
  await expect(page.getByText("Enter your phone number.")).toBeVisible() // Lao needs a phone
  await page.getByLabel("Phone").fill(`206${String(Date.now()).slice(-7)}`)
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page).toHaveURL(`/dashboard/${club.id}`)
  await page.reload()
  await expect(page).toHaveURL(`/dashboard/${club.id}`) // not asked again
})
