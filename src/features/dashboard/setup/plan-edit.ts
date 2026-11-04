import type { FloorItem, ManagedTable } from "@/lib/api/types"
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
