import { displayPhone } from "./phone"

// accounts made with a phone only get a stand-in address on this domain (the server's GeneratedEmailDomain): not a
// real email, so it is never shown
const STAND_IN = "@no-email.invalid"

/** The email, or "" when it is only the stand-in of an account without one */
export const realEmail = (email: string | undefined) =>
  email && !email.toLowerCase().endsWith(STAND_IN) ? email : ""

/** How to reach someone, for "Booking as …": the real email, else the phone */
export const contactOf = (u: { email?: string; phone?: string } | null) =>
  realEmail(u?.email) || (u?.phone ? displayPhone(u.phone) : "")
