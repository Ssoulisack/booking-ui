import { describe, expect, it } from "vitest"

import i18n from "@/i18n"
import { ApiError } from "@/lib/api/client"
import { codeMessage, errorMessage } from "@/lib/errors"

const t = i18n.t.bind(i18n)

describe("error messages", () => {
  it("turns a known code into a sentence", () => {
    expect(codeMessage("SLOT_NOT_AVAILABLE", t)).toBe(
      "This time is no longer free. Please pick another time.",
    )
  })

  it("names the date of a repeating-class clash", () => {
    expect(codeMessage("SLOT_NOT_AVAILABLE_ON_2026-11-02", t)).toBe(
      "The space or coach is not free on 2026-11-02.",
    )
  })

  it("falls back to a generic sentence that keeps the code", () => {
    expect(codeMessage("SOMETHING_NEW", t)).toBe(
      "Something went wrong (SOMETHING_NEW). Please try again.",
    )
  })

  it("reads the code from an ApiError, and anything else as unknown", () => {
    expect(errorMessage(new ApiError(429, "RATE_LIMIT_EXCEEDED"), t)).toMatch(
      /Too many tries/,
    )
    expect(errorMessage(new Error("boom"), t)).toMatch(/\(UNKNOWN\)/)
  })

  it("falls back to English for languages not translated yet", async () => {
    await i18n.changeLanguage("lo")
    expect(codeMessage("CLASS_FULL", t)).toBe(
      "Not enough seats left in this class.",
    )
    await i18n.changeLanguage("en")
  })
})
