import type { Availability } from "@/lib/api/types"

/** The lengths offered on this day, shortest first */
export function lengthsOf(availability: Availability): number[] {
  return [...new Set(availability.slots.flatMap((s) => s.durations_min))].sort(
    (a, b) => a - b,
  )
}
