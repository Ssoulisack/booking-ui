import type { FloorItem, FloorItemKind, ManagedTable } from "@/lib/api/types"

// Restaurant floor plans: the same rules as the backend (domain/restaurant.go)

type Placed = Pick<
  ManagedTable,
  "plan_x" | "plan_y" | "plan_w" | "plan_h" | "rotation"
>

/** The rectangle a table or object covers on the plan, after its rotation */
export function footprint(t: Placed) {
  const turned = t.rotation === 90 || t.rotation === 270
  return {
    x: t.plan_x,
    y: t.plan_y,
    w: turned ? t.plan_h : t.plan_w,
    h: turned ? t.plan_w : t.plan_h,
  }
}

export function overlaps(a: Placed, b: Placed) {
  const p = footprint(a)
  const q = footprint(b)
  return (
    p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h
  )
}

export function inside(t: Placed, width: number, height: number) {
  const f = footprint(t)
  return f.x >= 0 && f.y >= 0 && f.x + f.w <= width && f.y + f.h <= height
}

/** The objects that take floor space: no table may stand on them */
const BLOCKS: Record<FloorItemKind, boolean> = {
  bar: true,
  pole: true,
  stage: true,
  toilet: true,
  entry: false,
  label: false,
  zone: false,
  stairs: true,
}

export const FLOOR_ITEM_KINDS = Object.keys(BLOCKS) as FloorItemKind[]

export const blocks = (item: Pick<FloorItem, "kind">) => BLOCKS[item.kind]

/** The size a new object starts with, in grid squares */
export const ITEM_SIZES: Record<FloorItemKind, [number, number]> = {
  bar: [6, 2],
  pole: [1, 1],
  stage: [6, 3],
  toilet: [2, 2],
  entry: [3, 1],
  label: [4, 1],
  zone: [8, 5],
  stairs: [2, 3],
}

/** Floors an area can be on, lowest first */
export const FLOORS = Array.from({ length: 14 }, (_, i) => i - 3)

/** "Ground floor", "Floor 2", "Basement 1" */
export function floorName(
  t: (key: string, o?: Record<string, unknown>) => string,
  floor: number,
) {
  if (floor === 0) return t("restaurant.floors.ground")
  if (floor < 0) return t("restaurant.floors.basement", { n: -floor })
  return t("restaurant.floors.up", { n: floor })
}

// ---------- choosing tables (the same rules as domain.CheckTables) ----------

type Seated = Placed & {
  id: number
  sport_id: number
  seats: number
  extra_chairs: number
}

/** At most this many squares apart: two tables can be joined for one group */
export const JOIN_GAP = 1

export function nextTo(a: Placed, b: Placed, gap = JOIN_GAP) {
  const p = footprint(a)
  const q = footprint(b)
  const dx = Math.max(q.x - (p.x + p.w), p.x - (q.x + q.w), 0)
  const dy = Math.max(q.y - (p.y + p.h), p.y - (q.y + q.h), 0)
  return dx <= gap && dy <= gap && !overlaps(a, b)
}

const seatsOf = (tables: Seated[], withExtra: boolean) =>
  tables.reduce((n, t) => n + t.seats + (withExtra ? t.extra_chairs : 0), 0)

function groups(tables: Seated[]) {
  const out: Seated[][] = []
  const used = new Set<number>()
  for (const start of tables) {
    if (used.has(start.id)) continue
    used.add(start.id)
    const group = [start]
    for (let k = 0; k < group.length; k++) {
      for (const t of tables) {
        if (
          !used.has(t.id) &&
          t.sport_id === group[k].sport_id &&
          nextTo(group[k], t)
        ) {
          used.add(t.id)
          group.push(t)
        }
      }
    }
    out.push(group)
  }
  return out
}

/** The free tables can seat the group on real seats somewhere (then extra chairs are not offered) */
export const realSeatsChoice = (free: Seated[], guests: number) =>
  groups(free).some((g) => seatsOf(g, false) >= guests)

export type TableCheck =
  | { ok: true; seats: number; extraUsed: boolean }
  | {
      ok: false
      code:
        | "TABLE_REQUIRED"
        | "TABLES_NOT_TOGETHER"
        | "TABLES_TOO_SMALL"
        | "TABLE_IS_EXTRA"
      seats: number
    }

/** Are these tables right for the group, given every free table at that time? */
export function checkTables(
  chosen: Seated[],
  guests: number,
  free: Seated[],
): TableCheck {
  const seats = seatsOf(chosen, false)
  if (chosen.length === 0) return { ok: false, code: "TABLE_REQUIRED", seats }
  if (groups(chosen).length !== 1)
    return { ok: false, code: "TABLES_NOT_TOGETHER", seats }
  if (seats >= guests) {
    if (chosen.some((t) => seats - t.seats >= guests))
      return { ok: false, code: "TABLE_IS_EXTRA", seats }
    return { ok: true, seats, extraUsed: false }
  }
  if (realSeatsChoice(free, guests))
    return { ok: false, code: "TABLES_TOO_SMALL", seats }
  const total = seatsOf(chosen, true)
  if (total < guests) return { ok: false, code: "TABLES_TOO_SMALL", seats }
  if (chosen.some((t) => total - t.seats - t.extra_chairs >= guests))
    return { ok: false, code: "TABLE_IS_EXTRA", seats }
  return { ok: true, seats, extraUsed: true }
}

/** A zone holds a table when the table's centre lies inside the zone (as domain.FloorItem.Holds) */
export function zoneHolds(zone: Placed & { kind: string }, table: Placed) {
  if (zone.kind !== "zone") return false
  const z = footprint(zone)
  const t = footprint(table)
  const cx = 2 * t.x + t.w
  const cy = 2 * t.y + t.h
  return (
    cx > 2 * z.x && cx < 2 * (z.x + z.w) && cy > 2 * z.y && cy < 2 * (z.y + z.h)
  )
}
