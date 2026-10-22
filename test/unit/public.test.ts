import { colord, extend } from "colord"
import a11yPlugin from "colord/plugins/a11y"
import { describe, expect, it } from "vitest"

import { brandStyle } from "@/features/public/brand"
import {
  bookingTitle,
  canCancel,
  zoneOf,
} from "@/features/public/booking-utils"
import { readSelection, selectionQuery } from "@/features/public/selection"
import type { Booking } from "@/lib/api/types"
import { dayIn, duration, money, nextDays, timeIn } from "@/lib/format"
import { webUrl } from "@/lib/url"

extend([a11yPlugin])

describe("formatting", () => {
  it("shows kip without decimals", () => {
    expect(money(150000, "LAK")).toBe("₭150,000")
  })

  it("writes lengths the way people say them", () => {
    expect([30, 60, 90, 120].map(duration)).toEqual([
      "30 min",
      "1 h",
      "1 h 30 min",
      "2 h",
    ])
  })

  it("shows times in the business time zone, not the phone's", () => {
    expect(timeIn("2026-11-02T01:00:00Z", "Asia/Vientiane")).toBe("08:00")
    expect(dayIn("2026-11-01T20:00:00Z", "Asia/Vientiane")).toBe("Mon 2 Nov")
  })

  it("lists the next days from today in the business time zone", () => {
    // 23:30 UTC on 1 Nov is already 2 Nov in Vientiane (UTC+7)
    const now = new Date("2026-11-01T23:30:00Z")
    expect(nextDays("Asia/Vientiane", 3, now)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ])
  })
})

describe("brand colour", () => {
  const vars = (hex: string) => brandStyle(hex) as Record<string, string>

  it("puts white text on a dark brand and dark text on a pale one", () => {
    expect(vars("#0e7c66")["--brand-foreground"]).toBe("#ffffff")
    expect(vars("#fde047")["--brand-foreground"]).toBe("#141a17")
  })

  it("darkens a pale brand until it is readable as text on white", () => {
    const ink = vars("#fde047")["--brand-ink"]
    expect(colord(ink).contrast("#ffffff")).toBeGreaterThanOrEqual(4.5)
  })

  it("falls back to the default colour when the brand colour is not valid", () => {
    expect(vars("not-a-colour")["--brand"]).toBe("#0e7c66")
  })
})

describe("choice in the address bar", () => {
  it("reads a choice and writes it back", () => {
    const sel = readSelection(
      new URLSearchParams(
        "sport=2&what=court&court=5&date=2026-11-02&start=2026-11-02T08:00:00%2B07:00&length=90",
      ),
    )
    expect(sel).toEqual({
      sport: 2,
      what: "court",
      court: 5,
      date: "2026-11-02",
      start: "2026-11-02T08:00:00+07:00",
      length: 90,
    })
    expect(readSelection(new URLSearchParams(selectionQuery(sel)))).toEqual(sel)
  })

  it("drops values that are not valid", () => {
    expect(
      readSelection(
        new URLSearchParams(
          "sport=abc&what=spa&court=-1&date=tomorrow&seats=1.5",
        ),
      ),
    ).toEqual({})
  })
})

describe("bookings", () => {
  const booking = (over: Partial<Booking> = {}): Booking => ({
    id: 1,
    code: "AB12CD34",
    sport_id: 1,
    sport_name: "Tennis",
    branch_name: "Club",
    branch_slug: "club",
    status: "confirmed",
    starts_at: "2026-11-02T08:00:00+07:00",
    ends_at: "2026-11-02T09:00:00+07:00",
    total_price: 350000,
    currency: "LAK",
    payment_status: "unpaid",
    cancellable_until: "2026-11-01T08:00:00+07:00",
    notes: "",
    created_at: "",
    items: [
      {
        kind: "resource",
        resource_name: "Court 2",
        seats: 1,
        starts_at: "",
        ends_at: "",
        price: 150000,
      },
      {
        kind: "coach",
        coach_name: "Somchai",
        seats: 1,
        starts_at: "",
        ends_at: "",
        price: 200000,
      },
    ],
    ...over,
  })

  it("names what was booked", () => {
    expect(bookingTitle(booking())).toBe("Court 2 + Somchai")
    expect(bookingTitle(booking({ items: [] }))).toBe("Tennis")
  })

  it("reads the venue's time zone from the time itself", () => {
    expect(zoneOf("2026-11-02T08:00:00+07:00")).toBe("+07:00")
    expect(zoneOf("2026-11-02T01:00:00Z")).toBe("UTC")
  })

  it("allows cancelling online only before the deadline and while active", () => {
    const before = Date.parse("2026-11-01T07:00:00+07:00")
    const after = Date.parse("2026-11-01T09:00:00+07:00")
    expect(canCancel(booking(), before)).toBe(true)
    expect(canCancel(booking(), after)).toBe(false)
    expect(canCancel(booking({ status: "cancelled" }), before)).toBe(false)
  })
})

describe("links from businesses", () => {
  it("keeps only plain web addresses", () => {
    expect(webUrl("https://facebook.com/club")).toBe(
      "https://facebook.com/club",
    )
    expect(webUrl("javascript:alert(1)")).toBeUndefined()
    expect(webUrl("not a url")).toBeUndefined()
    expect(webUrl("")).toBeUndefined()
  })
})
