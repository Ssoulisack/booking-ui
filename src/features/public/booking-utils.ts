import type { Booking } from "@/lib/api/types"

/** The time zone written in a backend time ("…+07:00"), so a booking shows the venue's local time */
export function zoneOf(iso: string): string {
  const m = iso.match(/([+-]\d{2}:\d{2}|Z)$/)
  return m ? (m[1] === "Z" ? "UTC" : m[1]) : "UTC"
}

/** What was booked, in words: "Court 2 + Somchai", or the class title */
/**
 * What the booking holds now: a group moved to other tables keeps its earlier tables in the list
 * (ended or let go); those are left out. A cancelled booking shows what it had.
 */
export function currentItems(b: Booking) {
  const live = b.items.filter((i) => i.active !== false)
  if (live.length === 0) return b.items
  const last = live.reduce((m, i) => (i.ends_at > m ? i.ends_at : m), "")
  return live.filter((i) => i.ends_at === last)
}

export function bookingTitle(b: Booking): string {
  const names = currentItems(b).flatMap((i) =>
    [i.class_title, i.resource_name, i.coach_name].filter(Boolean),
  )
  return names.join(" + ") || b.sport_name
}

/** A customer may cancel online while the booking is active and before the deadline */
export function canCancel(b: Booking, now = Date.now()) {
  return (
    (b.status === "pending" || b.status === "confirmed") &&
    now < Date.parse(b.cancellable_until)
  )
}

const NAMED_KINDS = ["court", "pitch", "ring", "lane", "bay", "table", "room"]

/** The kind all these spaces share (court, ring, lane…), or "space" when they differ or are "other" */
export function kindOf(spaces: Array<{ kind: string }>): string {
  const kinds = new Set(spaces.map((r) => r.kind))
  const [only] = kinds
  return kinds.size === 1 && NAMED_KINDS.includes(only) ? only : "space"
}
