import type { Booking } from "@/lib/api/types"

/** The time zone written in a backend time ("…+07:00"), so a booking shows the venue's local time */
export function zoneOf(iso: string): string {
  const m = iso.match(/([+-]\d{2}:\d{2}|Z)$/)
  return m ? (m[1] === "Z" ? "UTC" : m[1]) : "UTC"
}

/** What was booked, in words: "Court 2 + Somchai", or the class title */
export function bookingTitle(b: Booking): string {
  const names = b.items.flatMap((i) =>
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
