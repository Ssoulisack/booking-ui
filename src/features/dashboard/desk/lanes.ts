import { formatInTimeZone } from "date-fns-tz"
import { useSyncExternalStore } from "react"

import type { CalendarEntry, CalendarLane } from "@/lib/api/types"
import { floorName } from "@/lib/floor-plan"

/** Minutes after midnight of `ymd`, in the business time zone (clamped to that day) */
export function minuteOf(iso: string, ymd: string, tz: string) {
  const day = formatInTimeZone(iso, tz, "yyyy-MM-dd")
  if (day < ymd) return 0
  if (day > ymd) return 24 * 60
  const [h, m] = formatInTimeZone(iso, tz, "HH:mm").split(":").map(Number)
  return h * 60 + m
}

export const STATUS_COLOR: Record<string, string> = {
  pending:
    "border-amber-400 dark:border-amber-400/50 bg-amber-50 dark:bg-amber-400/15 text-amber-950 dark:text-amber-200",
  confirmed:
    "border-sky-500 bg-sky-50 dark:bg-sky-400/15 text-sky-950 dark:text-sky-200",
  completed:
    "border-zinc-400 dark:border-zinc-400/50 bg-zinc-100 dark:bg-zinc-400/20 text-zinc-700 dark:text-zinc-300",
  no_show:
    "border-rose-400 dark:border-rose-400/50 bg-rose-50 dark:bg-rose-400/15 text-rose-900 dark:text-rose-200",
}

export const SIZES = {
  compact: { hour: 96, row: 40 },
  roomy: { hour: 160, row: 56 },
} as const
export type Density = keyof typeof SIZES

/** Phones and small tablets get the agenda list instead of the timeline */
const WIDE = "(min-width: 768px)"
export function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const q = window.matchMedia(WIDE)
      q.addEventListener("change", cb)
      return () => q.removeEventListener("change", cb)
    },
    () => window.matchMedia(WIDE).matches,
  )
}

export interface LaneGroup {
  key: string
  label: string
  lanes: CalendarLane[]
}

/**
 * Courts / tables under their sport or area (restaurants: by floor, then area), coaches last.
 * The floor is named only when the place has more than one.
 */
export function groupLanes(
  lanes: CalendarLane[],
  restaurant: boolean,
  t: (key: string, o?: Record<string, unknown>) => string,
): LaneGroup[] {
  const floors = new Set(
    lanes.filter((l) => l.owner_type === "resource").map((l) => l.floor),
  )
  const groups = new Map<string, LaneGroup & { floor: number }>()
  for (const l of lanes) {
    const key = l.owner_type === "coach" ? "coach" : `g${l.group_id}`
    let g = groups.get(key)
    if (!g) {
      const label =
        l.owner_type === "coach"
          ? t("desk.coaches")
          : restaurant && floors.size > 1
            ? `${l.group_name} · ${floorName(t, l.floor)}`
            : l.group_name
      g = {
        key,
        label,
        lanes: [],
        floor: l.owner_type === "coach" ? 999 : l.floor,
      }
      groups.set(key, g)
    }
    g.lanes.push(l)
  }
  const list = [...groups.values()]
  if (restaurant) list.sort((a, b) => a.floor - b.floor)
  return list.map(({ key, label, lanes }) => ({ key, label, lanes }))
}

/** Does a booking match what was typed (name or booking code)? */
export const matches = (e: CalendarEntry, q: string) =>
  !q ||
  (e.kind === "booking" &&
    `${e.name ?? ""} ${e.code ?? ""}`.toLowerCase().includes(q.toLowerCase()))
