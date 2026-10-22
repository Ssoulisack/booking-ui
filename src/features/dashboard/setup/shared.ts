import { useQueryClient } from "@tanstack/react-query"

import { useBiz } from "../api"

/** Refresh these parts of the business's data (plus plan usage and the public page) */
export function useInvalidate(parts: string[]) {
  const { key } = useBiz()
  const queryClient = useQueryClient()
  return () => {
    for (const part of [...parts, "usage"]) {
      void queryClient.invalidateQueries({ queryKey: key(part) })
    }
    void queryClient.invalidateQueries({ queryKey: ["public"] })
  }
}

/** Weekdays in the order people read a week (Monday first); the API counts 0 = Sunday */
export const WEEK = [1, 2, 3, 4, 5, 6, 0] as const

/** "8" / "" from a number input → number or null */
export const numberOrNull = (v: string) => (v.trim() === "" ? null : Number(v))

/**
 * Weekdays in week order, runs joined: [1,2,3,4,5,6] → "Mon–Sat", [1,3,5] → "Mon, Wed, Fri"
 * (Monday first, as on the setup screens)
 */
export function weekdayText(
  days: number[],
  label: (day: number) => string,
): string {
  const week: readonly number[] = WEEK
  const order = week.filter((d) => days.includes(d))
  const runs: number[][] = []
  for (const d of order) {
    const last = runs[runs.length - 1]
    const prev = last?.[last.length - 1]
    if (prev !== undefined && week.indexOf(d) === week.indexOf(prev) + 1)
      last.push(d)
    else runs.push([d])
  }
  return runs
    .map((r) =>
      r.length >= 3
        ? `${label(r[0])}–${label(r[r.length - 1])}`
        : r.map(label).join(", "),
    )
    .join(", ")
}

/** The price of a length at an hourly price, rounded like the backend (half up to a whole unit) */
export const priceFor = (perHour: number, minutes: number) =>
  Math.floor((perHour * minutes + 30) / 60)

/**
 * The lengths people can book under a rule: the shortest, then each step up to the longest.
 * Many lengths are cut to the first three and the longest (null marks the gap).
 */
export function bookableLengths(rule: {
  min_duration_min: number
  max_duration_min: number
  duration_step_min: number
}): Array<number | null> {
  const { min_duration_min: min, max_duration_min: max } = rule
  const step = Math.max(rule.duration_step_min, 1)
  const all: number[] = []
  for (let m = min; m <= max && all.length < 100; m += step) all.push(m)
  return all.length > 4 ? [...all.slice(0, 3), null, all[all.length - 1]] : all
}
