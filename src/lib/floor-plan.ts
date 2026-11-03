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
