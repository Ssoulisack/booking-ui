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
}

const NUMBERS = ["sport", "court", "coach", "length", "cls", "seats"] as const

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
  const update = useCallback(
    (next: Selection) =>
      setParams(selectionQuery(next), {
        replace: true,
        preventScrollReset: true,
      }),
    [setParams],
  )
  return [sel, update] as const
}
