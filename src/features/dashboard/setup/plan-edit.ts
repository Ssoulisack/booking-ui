import type { FloorItem, ZoneShape } from "@/types/floor-plan"
import type { ManagedTable } from "@/types/space"
import { footprint, overlaps } from "@/lib/floor-plan"

// Editing several tables and objects of a floor plan at once: selection, copies, shortcuts

export type PieceType = "table" | "item"

/** A selected piece: "table:12" or "item:-3" (new, not yet saved ones have negative ids) */
export type PieceKey = `${PieceType}:${number}`

export const keyOf = (type: PieceType, id: number): PieceKey => `${type}:${id}`

export function parseKey(k: PieceKey): { type: PieceType; id: number } {
  const [type, id] = k.split(":")
  return { type: type as PieceType, id: Number(id) }
}

/** The tables and objects to copy, taken from the plan when Copy / Duplicate was pressed */
export interface Clip {
  tables: ManagedTable[]
  items: FloorItem[]
}

/** A snapshot of the plan, for Undo / Redo */
export interface Snap {
  tables: ManagedTable[]
  items: FloorItem[]
}

/**
 * The name of a copied table: "45" → "60" (the next number nobody uses), "T5" → "T9", anything
 * else → "VIP copy", "VIP copy 2"…
 */
export function copyName(name: string, taken: Set<string>): string {
  const m = name.trim().match(/^(.*?)(\d+)$/)
  if (m) {
    const [, prefix] = m
    let top = 0
    for (const other of taken) {
      const o = other.match(/^(.*?)(\d+)$/)
      if (o && o[1] === prefix) top = Math.max(top, Number(o[2]))
    }
    return `${prefix}${top + 1}`
  }
  const base = `${name.trim()} copy`
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const next = `${base} ${n}`
    if (!taken.has(next)) return next
  }
}

type Placed = Pick<
  ManagedTable,
  "plan_x" | "plan_y" | "plan_w" | "plan_h" | "rotation"
>

/** How far a group may move: the most to the left / up (negative) and right / down, to stay on the plan */
export function moveLimits(pieces: Placed[], width: number, height: number) {
  const fps = pieces.map(footprint)
  return {
    minDx: -Math.min(...fps.map((f) => f.x)),
    maxDx: width - Math.max(...fps.map((f) => f.x + f.w)),
    minDy: -Math.min(...fps.map((f) => f.y)),
    maxDy: height - Math.max(...fps.map((f) => f.y + f.h)),
  }
}

export const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n))

/** Mac keyboards use ⌘ and ⌥; Windows and Linux use Ctrl and Alt */
export const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)

/** Typing in a field, or a menu or dialog is open: the plan's shortcuts stay out of the way */
export function typingOrDialog(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return !!target.closest(
    "input, textarea, select, [contenteditable='true'], [role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox']",
  )
}

/**
 * Where a copy of the selection goes: the nearest place where every copied table is free — right of
 * the originals, else below, left, above, else a little further along the diagonal. Copied objects
 * only need to stay on the plan.
 */
export function copyOffset(
  copy: { tables: Placed[]; items: Placed[] },
  tablesNow: Placed[],
  blockers: Placed[],
  width: number,
  height: number,
): { dx: number; dy: number } {
  const all = [...copy.tables, ...copy.items]
  const lim = moveLimits(all, width, height)
  const fps = all.map(footprint)
  const gw =
    Math.max(...fps.map((f) => f.x + f.w)) - Math.min(...fps.map((f) => f.x))
  const gh =
    Math.max(...fps.map((f) => f.y + f.h)) - Math.min(...fps.map((f) => f.y))
  const candidates: Array<[number, number]> = [
    [gw + 1, 0],
    [0, gh + 1],
    [-(gw + 1), 0],
    [0, -(gh + 1)],
    ...Array.from({ length: 10 }, (_, i): [number, number] => [
      2 * (i + 1),
      2 * (i + 1),
    ]),
  ]
  const free = (dx: number, dy: number) => {
    if (dx < lim.minDx || dx > lim.maxDx || dy < lim.minDy || dy > lim.maxDy)
      return false
    return copy.tables.every((t) => {
      const moved = { ...t, plan_x: t.plan_x + dx, plan_y: t.plan_y + dy }
      return (
        !tablesNow.some((o) => overlaps(moved, o)) &&
        !blockers.some((o) => overlaps(moved, o))
      )
    })
  }
  const found = candidates.find(([dx, dy]) => free(dx, dy))
  // nowhere free: close to the originals, still on the plan (the red marks show what to move)
  const [dx, dy] = found ?? [2, 2]
  return {
    dx: clamp(dx, lim.minDx, lim.maxDx),
    dy: clamp(dy, lim.minDy, lim.maxDy),
  }
}

/** Which edge or corner of the selected piece is being dragged (compass points: n = top, w = left…) */
export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"

/**
 * The piece's rectangle (in grid cells) after dragging an edge or corner by (dx, dy) cells. The edge opposite the
 * one dragged stays where it is: dragging the left or top edge moves the piece's position as well as its size.
 * The piece stays on the plan (0..width, 0..height), at least `minSide` cells (1; an L zone needs 2) and at most
 * `maxSide` cells on a side.
 */
export function resizeBox(
  edge: ResizeEdge,
  start: { x: number; y: number; w: number; h: number },
  dx: number,
  dy: number,
  maxSide: number,
  width: number,
  height: number,
  minSide = 1,
) {
  let { x, y, w, h } = start
  if (edge.includes("e"))
    w = Math.max(minSide, Math.min(maxSide, width - x, start.w + dx))
  if (edge.includes("s"))
    h = Math.max(minSide, Math.min(maxSide, height - y, start.h + dy))
  if (edge.includes("w")) {
    const right = start.x + start.w
    x = Math.max(0, right - maxSide, Math.min(right - minSide, start.x + dx))
    w = right - x
  }
  if (edge.includes("n")) {
    const bottom = start.y + start.h
    y = Math.max(0, bottom - maxSide, Math.min(bottom - minSide, start.y + dy))
    h = bottom - y
  }
  return { x, y, w, h }
}

/**
 * An L zone keeps its cut-out inside its box: at least 1 square, and always less than the box on both sides (so an
 * L is left). Anything that is not an L zone comes back as it was.
 */
export function fitCut<
  T extends {
    shape?: string
    plan_w: number
    plan_h: number
    cut_w?: number
    cut_h?: number
  },
>(item: T): T {
  if (item.shape !== "l") return item
  return {
    ...item,
    cut_w: Math.max(1, Math.min(item.cut_w ?? 1, item.plan_w - 1)),
    cut_h: Math.max(1, Math.min(item.cut_h ?? 1, item.plan_h - 1)),
  }
}

/**
 * What changes when a zone is given another shape (the same choices as a table, and an L). Long is wider than deep,
 * as for a table; an L needs a box of at least 2 x 2 and starts with a cut of half the box in the top-right corner
 * (or the corner it had); the other shapes have no cut-out.
 */
export function zoneShapePatch(
  item: {
    plan_w: number
    plan_h: number
    cut_corner?: FloorItem["cut_corner"]
  },
  shape: ZoneShape,
  maxW: number,
  maxH: number,
): Partial<FloorItem> {
  if (shape === "l") {
    const w = Math.min(maxW, Math.max(2, item.plan_w))
    const h = Math.min(maxH, Math.max(2, item.plan_h))
    return {
      shape,
      plan_w: w,
      plan_h: h,
      cut_w: Math.max(1, Math.floor(w / 2)),
      cut_h: Math.max(1, Math.floor(h / 2)),
      cut_corner: item.cut_corner ?? "tr",
    }
  }
  const plain = { shape, cut_w: 0, cut_h: 0 }
  return shape === "long" && item.plan_w <= item.plan_h
    ? { ...plain, plan_w: Math.min(maxW, item.plan_h + 1) }
    : plain
}
