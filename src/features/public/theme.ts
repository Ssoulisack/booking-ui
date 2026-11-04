import { useEffect, type CSSProperties } from "react"

import { createModeStore, useHtmlMode, type ColorMode } from "@/lib/color-mode"

/**
 * Customer pages wear their own theme: navy night (default) or a light day, with bright candy
 * accents. While such a page is open, <html> carries `pub` (+ `dark`), so popups and menus rendered
 * outside the page follow too; the dashboard never gets it.
 */
export type PubMode = ColorMode

const store = createModeStore("pub-theme", "dark")
export const setPubMode = store.set
export const usePubMode = store.use

/** Put the customer theme on the page while this layout is shown */
export function usePublicTheme() {
  const current = usePubMode()
  useHtmlMode(current, ["pub"])
  return current
}

/**
 * The brand colour variables (--brand, --brand-ink…) on <html> too: popups, sheets and menus open
 * outside the page wrapper, and without these their brand text would fall back to black.
 */
export function useBrandOnPage(style: CSSProperties) {
  const vars = Object.entries(style).filter(([k]) => k.startsWith("--"))
  const key = JSON.stringify(vars)
  useEffect(() => {
    const root = document.documentElement
    const list = JSON.parse(key) as Array<[string, string]>
    for (const [k, v] of list) root.style.setProperty(k, String(v))
    return () => {
      for (const [k] of list) root.style.removeProperty(k)
    }
  }, [key])
}
