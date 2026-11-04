import { useEffect, useSyncExternalStore } from "react"

export type ColorMode = "dark" | "light"

/**
 * A dark / light choice kept per device (localStorage) that every component can read and change.
 * The customer site and the back office each have their own (different defaults).
 */
export function createModeStore(key: string, fallback: ColorMode) {
  const listeners = new Set<() => void>()
  const read = (): ColorMode => {
    try {
      const v = localStorage.getItem(key)
      return v === "dark" || v === "light" ? v : fallback
    } catch {
      return fallback
    }
  }
  let mode = read()
  const set = (next: ColorMode) => {
    mode = next
    try {
      localStorage.setItem(key, next)
    } catch {
      // private mode: the choice lasts until the page is left
    }
    listeners.forEach((l) => l())
  }
  const use = () =>
    useSyncExternalStore(
      (cb) => {
        listeners.add(cb)
        return () => listeners.delete(cb)
      },
      () => mode,
    )
  return { use, set }
}

// how many layouts want the classes now: while a page loads, the old and the new layout can overlap,
// and the old one leaving must not strip what the new one just put on
let holders = 0

/** Put `dark` (and extra classes) on <html> while the calling layout is shown */
export function useHtmlMode(
  mode: ColorMode,
  extra: string[] = [],
  enabled = true,
) {
  const key = extra.join(" ")
  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    const classes = key ? key.split(" ") : []
    holders++
    root.classList.add(...classes)
    root.classList.toggle("dark", mode === "dark")
    return () => {
      holders--
      if (holders === 0) root.classList.remove(...classes, "dark")
    }
  }, [mode, key, enabled])
}

/** The back office: light by default */
export const dashMode = createModeStore("dash-theme", "light")
