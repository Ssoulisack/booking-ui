import type { LucideIcon } from "lucide-react"

import { colord } from "colord"
import { useEffect, useState } from "react"

import GooeyNav from "@/components/reactbits/GooeyNav"

import { usePubMode } from "./theme"

export interface MobileNavItem {
  /** the same id on every page for the same place (booking, bookings, packages, account), so the pill can slide between pages */
  id?: string
  label: string
  icon?: LucideIcon
  // only the icon shows (saves width); the label stays as its accessible name
  iconOnly?: boolean
  onSelect: () => void
}

// where the pill stood on the page the customer just left: the next page's menu starts there and then slides, because
// Booking and My bookings are different pages (a different menu is built), not one menu that stays
let lastActiveId: string | null = null

/**
 * The menu on tablets and phones (React Bits Gooey Nav): a frosted pill floating at the bottom
 * within thumb reach, in the brand colour. From laptop width the page's own top bar is used.
 * Items are buttons: the page decides what a tap does (scroll, or a router link).
 */
export function MobileNav({
  items,
  active,
  color,
  themed,
}: {
  items: MobileNavItem[]
  active: number
  color?: string
  /** customer pages: follow their dark / light mode (other pages stay light) */
  themed?: boolean
}) {
  // follows the page: dark frame at night; a brand too dark to see on navy gives way to candy yellow
  const wanted = Math.min(Math.max(0, active), Math.max(0, items.length - 1))
  const [shown, setShown] = useState(() => {
    const from = lastActiveId
      ? items.findIndex((i) => i.id === lastActiveId)
      : -1
    return from >= 0 ? from : wanted
  })
  useEffect(() => {
    // paint once where the pill was, then move it: the slide the owner sees between Booking and My bookings
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setShown(wanted))
    })
    lastActiveId = items[wanted]?.id ?? null
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
    // items is rebuilt on every render; the position is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted])
  const pubMode = usePubMode()
  const mode = themed ? pubMode : "light"
  const pill =
    mode === "dark" && color && colord(color).contrast("#0e1330") < 3
      ? "#fbbf24"
      : color
  return (
    <div className="mobile-nav pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 flex justify-center px-3 lg:hidden">
      <div className="pointer-events-auto max-w-full">
        <GooeyNav
          items={items.map(({ label, icon: Icon, iconOnly }) => ({
            label: iconOnly ? "" : label,
            ariaLabel: iconOnly ? label : undefined,
            icon: Icon ? <Icon /> : undefined,
          }))}
          activeIndex={shown}
          onChange={(i) => items[i]?.onSelect()}
          theme={mode}
          color={pill}
          size="sm"
          particleCount={12}
          spread={44}
          animationTime={520}
          timeVariance={220}
        />
      </div>
    </div>
  )
}
