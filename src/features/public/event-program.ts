import type { LineupItem } from "@/lib/api/types"

/** "19:00 – 01:00", "19:00" alone, or "" when no time was set */
export function eventTimes(start: string, end: string) {
  if (!start) return ""
  return end ? `${start} – ${end}` : start
}

/**
 * When an event booking is, as written on a booking: the day and the event's own time ("Fri 6 Nov, 19:00 – 01:00"),
 * not the opening hours the tables are held for. No event time set: the day only.
 */
export function eventBookingWhen(day: string, start?: string, end?: string) {
  const time = eventTimes(start ?? "", end ?? "")
  return time ? `${day}, ${time}` : day
}

/** The lineup rows for one day: the rows for every day, then the rows of that day only, in the saved order */
export function lineupFor(lineup: LineupItem[], day?: string) {
  return lineup.filter((r) => r.day === "" || r.day === day)
}

/** Whether any row is for one particular day (then the program differs from day to day) */
export const hasDatedRows = (lineup: LineupItem[]) =>
  lineup.some((r) => r.day !== "")

/** "4 Nov 2026" or "31 Dec – 1 Jan 2027" */
export function eventDays(e: { starts_on: string; ends_on: string }) {
  const fmt = (d: string, year: boolean) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      ...(year ? { year: "numeric" } : {}),
    })
  return !e.ends_on || e.ends_on === e.starts_on
    ? fmt(e.starts_on, true)
    : `${fmt(e.starts_on, false)} – ${fmt(e.ends_on, true)}`
}
