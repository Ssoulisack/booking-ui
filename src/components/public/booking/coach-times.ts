import type { CoachAvailability } from "@/types/public"

/** A coach's free times on the day as ranges: each start with its longest length, joined where they touch */
export function freeRanges(slots: CoachAvailability["slots"]) {
  const parts = slots
    .map((s) => {
      const start = Date.parse(s.starts_at)
      return [start, start + Math.max(...s.durations_min) * 60_000]
    })
    .sort((a, b) => a[0] - b[0])
  const out: number[][] = []
  for (const [a, b] of parts) {
    const last = out[out.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out.map(([a, b]) => [
    new Date(a).toISOString(),
    new Date(b).toISOString(),
  ])
}
