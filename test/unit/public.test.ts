import { colord, extend } from "colord"
import a11yPlugin from "colord/plugins/a11y"
import { describe, expect, it } from "vitest"

import { brandStyle, ringColors } from "@/features/public/brand"
import {
  bookingTitle,
  canCancel,
  kindOf,
  zoneOf,
} from "@/features/public/booking-utils"
import {
  bookableLengths,
  priceFor,
  weekdayText,
} from "@/features/dashboard/setup/shared"
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

describe("what customers call the spaces", () => {
  it("uses the kind the spaces share", () => {
    expect(kindOf([{ kind: "ring" }, { kind: "ring" }])).toBe("ring")
    expect(kindOf([{ kind: "lane" }])).toBe("lane")
  })

  it("says space for a mix, for other, or for none", () => {
    expect(kindOf([{ kind: "court" }, { kind: "room" }])).toBe("space")
    expect(kindOf([{ kind: "other" }])).toBe("space")
    expect(kindOf([])).toBe("space")
  })
})

describe("hero rings in the brand colour", () => {
  it("glows in lighter tints on a dark brand", () => {
    const r = ringColors("#0e7c66")
    expect(r.theme).toBe("dark")
    expect(colord(r.color).brightness()).toBeGreaterThan(
      colord("#0e7c66").brightness(),
    )
  })

  it("draws deeper shades on a pale brand", () => {
    const r = ringColors("#fde68a")
    expect(r.theme).toBe("light")
    expect(colord(r.colorTwo).brightness()).toBeLessThan(
      colord("#fde68a").brightness(),
    )
  })

  it("falls back to the default brand for a missing or bad colour", () => {
    expect(ringColors(undefined)).toEqual(ringColors("#0e7c66"))
    expect(ringColors("not a colour")).toEqual(ringColors("#0e7c66"))
  })
})

describe("weekly class days as text", () => {
  const short = (d: number) =>
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]

  it("joins a run of three or more days", () => {
    expect(weekdayText([1, 2, 3, 4, 5, 6], short)).toBe("Mon–Sat")
    expect(weekdayText([6, 0], short)).toBe("Sat, Sun")
  })

  it("lists days that are apart, Monday first", () => {
    expect(weekdayText([5, 1, 3], short)).toBe("Mon, Wed, Fri")
    expect(weekdayText([0, 1, 2, 3], short)).toBe("Mon–Wed, Sun")
  })
})

describe("price of each bookable length", () => {
  it("rounds half up like the backend", () => {
    expect(priceFor(150000, 60)).toBe(150000)
    expect(priceFor(150000, 90)).toBe(225000)
    expect(priceFor(100, 50)).toBe(83) // 83.33
    expect(priceFor(250, 90)).toBe(375)
  })

  it("lists the lengths the rule allows", () => {
    const rule = (min: number, max: number, step: number) => ({
      min_duration_min: min,
      max_duration_min: max,
      duration_step_min: step,
    })
    expect(bookableLengths(rule(60, 60, 30))).toEqual([60])
    expect(bookableLengths(rule(60, 120, 30))).toEqual([60, 90, 120])
    // many lengths: the first three, a gap, the longest
    expect(bookableLengths(rule(60, 180, 30))).toEqual([60, 90, 120, null, 180])
  })
})
