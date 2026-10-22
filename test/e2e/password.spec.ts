import { expect, test } from "@playwright/test"

import { call, PASSWORD, resetToken, uniqueEmail } from "./helpers"

// Forgot / reset password, using only the email link (no login, so it does not use up the login rate limit)
test("a customer resets a forgotten password from the email link", async ({
  page,
}) => {
  const email = uniqueEmail("forgetful")
  await call("/auth/register", {
    method: "POST",
    body: {
      name: "Fay Forgetful",
      email,
      password: PASSWORD,
      nationality: "TH",
    },
  })

  await page.goto("/login")
  await page.getByRole("link", { name: "Forgot password?" }).click()
  await expect(
    page.getByRole("heading", { name: "Forgot password" }),
  ).toBeVisible()
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByRole("button", { name: "Send link" }).click()
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible()
  await expect(
    page.getByText(`If an account exists for ${email}`),
  ).toBeVisible()

  await page.goto(`/reset-password/${await resetToken(email)}`)
  await page.getByLabel("New password").fill("NewSecret456!")
  await page.getByLabel("Confirm password").fill("Different789!")
  await page.getByRole("button", { name: "Save password" }).click()
  await expect(page.getByText("The passwords do not match.")).toBeVisible()

  await page.getByLabel("Confirm password").fill("NewSecret456!")
  await page.getByRole("button", { name: "Save password" }).click()
  await expect(page).toHaveURL("/login")
  await expect(page.getByText("Your password has been changed.")).toBeVisible()
})
