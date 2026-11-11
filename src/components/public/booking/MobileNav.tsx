import type { LucideIcon } from "lucide-react"

import { colord } from "colord"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

import GooeyNav from "@/components/reactbits/GooeyNav"

import { usePubMode } from "./theme"

export interface MobileNavItem {
  /** the same id on every page for the same place (booking, bookings, packages, account), so the pill can slide between pages */
  id?: string
  label: string
  icon?: LucideIcon
  // only the icon shows (saves width); the label stays as its accessible name
  iconOnly?: boolean
  /** the main action: a big round button in the middle of the pill, raised above the others (needs 3 or more items) */
  center?: boolean
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

  // the main action goes to the middle of the row: the pill keeps an empty slot there and the round button sits on it
  const hero = items.length >= 3 ? items.findIndex((i) => i.center) : -1
  const order = items.map((_, i) => i)
  if (hero >= 0) {
    order.splice(hero, 1)
    order.splice(Math.floor(items.length / 2), 0, hero)
  }
  const slot = hero >= 0 ? order.indexOf(hero) : -1
  const shownSlot = Math.max(0, order.indexOf(shown))
  const box = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    const root = box.current
    if (!root || slot < 0) return
    const measure = () => {
      const li = root.querySelector<HTMLElement>(
        `li[data-gooey-index="${slot}"]`,
      )
      if (!li) return
      const a = root.getBoundingClientRect()
      const b = li.getBoundingClientRect()
      setAt({
        x: Math.round(b.left - a.left + b.width / 2),
        y: Math.round(b.top - a.top + b.height / 2),
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [slot, items.length])
  const heroItem = hero >= 0 ? items[hero] : null
  const heroColor = pill || (mode === "dark" ? "#fbbf24" : "#27272a")
  const HeroIcon = heroItem?.icon

  return (
    <div className="mobile-nav pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 flex justify-center px-3 lg:hidden">
      <div ref={box} className="pointer-events-auto relative max-w-full">
        <GooeyNav
          items={order.map((o) => {
            const { label, icon: Icon, iconOnly } = items[o]
            if (o === hero) {
              // an empty slot as wide as the round button's foot
              return {
                label: "",
                ariaLabel: label,
                icon: <span className="block h-5 w-8" aria-hidden />,
              }
            }
            return {
              label: iconOnly ? "" : label,
              ariaLabel: iconOnly ? label : undefined,
              icon: Icon ? <Icon /> : undefined,
            }
          })}
          activeIndex={shownSlot}
          onChange={(i) => items[order[i]]?.onSelect()}
          theme={mode}
          color={pill}
          size="sm"
          particleCount={12}
          spread={44}
          animationTime={520}
          timeVariance={220}
        />
        {heroItem && at && (
          <button
            type="button"
            aria-label={heroItem.label}
            onClick={() => heroItem.onSelect()}
            className="nav-hero absolute flex size-16 -translate-x-1/2 -translate-y-[calc(50%+22px)] items-center justify-center rounded-full border-4 border-background shadow-xl transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring active:scale-95"
            style={{
              left: at.x,
              top: at.y,
              background: heroColor,
              color: colord(heroColor).isLight() ? "#10142c" : "#ffffff",
            }}
          >
            {HeroIcon && <HeroIcon className="size-7" />}
          </button>
        )}
      </div>
    </div>
  )
}
