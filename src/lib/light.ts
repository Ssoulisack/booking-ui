import { timeIn } from "@/lib/format"

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

/**
 * What sport light costs for a booking of `minutes` from `startIso`: the space's light price per hour for the time
 * after the light starts, rounded like the server does. null when the space has no light or the booking ends before
 * the light starts (nothing to add).
 */
export function lightCost(
  space: { light_price?: number; light_from?: string } | undefined,
  startIso: string | undefined,
  minutes: number | undefined,
  tz: string,
): { minutes: number; amount: number; from: string } | null {
  const perHour = space?.light_price ?? 0
  if (!perHour || !startIso || !minutes) return null
  const from = space?.light_from || "17:00"
  const start = clock(timeIn(startIso, tz))
  const lit = start + minutes - Math.max(start, clock(from))
  if (lit <= 0) return null
  return { minutes: lit, amount: Math.floor((perHour * lit + 30) / 60), from }
}
