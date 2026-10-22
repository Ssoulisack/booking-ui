import { describe, expect, it } from "vitest"

import { registerSchema } from "@/features/auth/schemas"
import { countryOptions } from "@/lib/countries"
import { displayPhone, normalizePhone, telHref } from "@/lib/phone"

describe("phone numbers (same rule as the backend)", () => {
  it("keeps the format 20xxxxxxxx and converts the usual habits to it", () => {
    for (const raw of [
      "2055551234",
      "20 5555 1234",
      "020 5555 1234",
      "+856 20 5555 1234",
      "856-20-5555-1234",
    ]) {
      expect(normalizePhone(raw)).toBe("2055551234")
    }
  })

  it("accepts only 20 and 8 digits", () => {
    expect(normalizePhone("030 512 3456")).toBeNull()
    expect(normalizePhone("+66 81 234 5678")).toBeNull()
    expect(normalizePhone("20555512")).toBeNull()
  })

  it("shows the stored format and dials with the country code", () => {
    expect(displayPhone("2055551234")).toBe("2055551234")
    expect(telHref("2055551234")).toBe("tel:+8562055551234")
    expect(telHref("+66 81 234 5678")).toBe("tel:+66812345678")
  })
})

describe("registering", () => {
  const base = { name: "Noy", password: "password123", phone: "", email: "" }
  const issues = (v: object) =>
    registerSchema
      .safeParse(v)
      .error?.issues.map((i) => `${i.path.join(".")}:${i.message}`) ?? []

  it("asks for a nationality", () => {
    expect(issues({ ...base, nationality: "" })).toContain(
      "nationality:identity.nationalityRequired",
    )
  })

  it("needs a phone for Lao accounts, email optional", () => {
    expect(issues({ ...base, nationality: "LA" })).toEqual([
      "phone:identity.phoneRequired",
    ])
    expect(
      issues({ ...base, nationality: "LA", phone: "020 5555 1234" }),
    ).toEqual([])
  })

  it("needs an email for other nationalities, phone optional", () => {
    expect(issues({ ...base, nationality: "TH" })).toEqual([
      "email:identity.emailRequired",
    ])
    expect(issues({ ...base, nationality: "TH", email: "a@b.th" })).toEqual([])
    expect(
      issues({
        ...base,
        nationality: "TH",
        email: "a@b.th",
        phone: "0812345678",
      }),
    ).toEqual(["phone:identity.phoneInvalid"])
    // account phones are Lao only, whatever the nationality: a Thai number is refused, a Lao one accepted
    expect(
      issues({
        ...base,
        nationality: "TH",
        email: "a@b.th",
        phone: "+66 81 234 5678",
      }),
    ).toEqual(["phone:identity.phoneInvalid"])
    expect(
      issues({
        ...base,
        nationality: "TH",
        email: "a@b.th",
        phone: "020 5555 1234",
      }),
    ).toEqual([])
  })
})

describe("nationality list", () => {
  it("puts Laos first and names countries in the page language", () => {
    const { first, rest } = countryOptions("en")
    expect(first[0]).toEqual({ code: "LA", name: "Laos" })
    expect(rest.length).toBeGreaterThan(200)
    expect(rest.some((c) => c.code === "LA")).toBe(false)
  })
})
