import { useCallback } from "react"
import { useSearchParams } from "react-router"

export type BookWhat = "court" | "coach" | "class"

/**
 * What the visitor is choosing, kept in the address (?sport=1&what=court&court=3&date=…), so
 * the back button, a refresh or a shared link keep the choice.
 */
export interface Selection {
  sport?: number
  what?: BookWhat
  court?: number
  coach?: number
  date?: string
  start?: string
  length?: number
  cls?: number
  seats?: number
  /** restaurants: the group size and the chosen tables */
  guests?: number
  tables?: string
  /** courts: 1 = the visitor wants a coach with the space (picked on the coach step) */
  withCoach?: number
  /** the open step: the table (restaurants), the coach or the time (courts) */
  step?: "table" | "coach" | "time"
  /** sport: pay with this package of the customer's; 0 = they chose to book without package; none = picked for them */
  pkg?: number
}

const NUMBERS = [
  "sport",
  "court",
  "coach",
  "length",
  "cls",
  "seats",
  "guests",
  "withCoach",
] as const

export function readSelection(params: URLSearchParams): Selection {
  const sel: Selection = {}
  for (const key of NUMBERS) {
    const n = Number(params.get(key))
    if (Number.isInteger(n) && n > 0) sel[key] = n
  }
  const what = params.get("what")
  if (what === "court" || what === "coach" || what === "class") sel.what = what
  const date = params.get("date")
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) sel.date = date
  const start = params.get("start")
  if (start) sel.start = start
  const step = params.get("step")
  if (step === "table" || step === "coach" || step === "time") sel.step = step
  const pkg = params.get("pkg")
  if (pkg !== null && /^\d{1,9}$/.test(pkg)) sel.pkg = Number(pkg)
  const tables = params.get("tables")
  if (tables && /^\d+(-\d+)*$/.test(tables)) sel.tables = tables
  return sel
}

export function selectionQuery(sel: Selection): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(sel)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

/** The selection in the URL, and a setter that replaces history (no back-button spam) */
export function useSelection() {
  const [params, setParams] = useSearchParams()
  const sel = readSelection(params)
  // push: a new step (the back button returns to the one before); otherwise the entry is replaced
  const update = useCallback(
    (next: Selection, opts?: { push?: boolean }) =>
      setParams(selectionQuery(next), {
        replace: !opts?.push,
        preventScrollReset: true,
      }),
    [setParams],
  )
  return [sel, update] as const
}

/** The table ids of a selection ("3-4" → [3, 4]) */
export const tableIdsOf = (sel: Selection) =>
  sel.tables ? sel.tables.split("-").map(Number) : []
