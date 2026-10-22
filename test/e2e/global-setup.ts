import {
  call,
  OWNER,
  PASSWORD,
  publishedClub,
  setNationality,
  uniqueEmail,
  type Session,
} from "./helpers"

// Once per run: one login of the company owner and one customer account (both rate limited per
// IP), and one published branch, shared by every spec and screen size through environment variables
export default async function globalSetup() {
  const owner = await call<Session>("/auth/login", {
    method: "POST",
    body: OWNER,
  })
  // the owner from config.yaml has no nationality yet: answer it once so the browser does not ask
  await setNationality(owner, "Demo Owner")
  process.env.E2E_OWNER = JSON.stringify(owner)
  process.env.E2E_CLUB = JSON.stringify(await publishedClub(owner))
  const customer = await call("/auth/register", {
    method: "POST",
    body: {
      name: "Cara Customer",
      email: uniqueEmail("cara"),
      password: PASSWORD,
      nationality: "TH",
    },
  })
  process.env.E2E_CUSTOMER = JSON.stringify(customer)
}
