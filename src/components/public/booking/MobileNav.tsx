import type { LucideIcon } from "lucide-react"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { AttentionDot } from "@/components/global/AttentionDot"
import GlassSurface from "@/components/reactbits/GlassSurface"
import { needsEmail } from "@/lib/account-email"
import { useSession } from "@/stores/session"

import { cn } from "@/lib/utils"

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
 * The menu on tablets and phones (React Bits Glass Surface): a glass pill floating at the bottom
 * within thumb reach; the open page has a brand-colour pill that slides between items. From laptop width the page's own top bar is used.
 * Items are buttons: the page decides what a tap does (scroll, or a router link).
 */
export function MobileNav({
  items,
  active,
  themed,
}: {
  items: MobileNavItem[]
  active: number
  /** customer pages: follow their dark / light mode (other pages stay light) */
  themed?: boolean
}) {
  // follows the page: dark frame at night
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
  const { t } = useTranslation()
  // My account gets a red dot while the email is missing or not verified
  const attention = needsEmail(useSession((s) => s.user))
  const pubMode = usePubMode()
  const mode = themed ? pubMode : "light"

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
  // the brand pill under the open item: where it stands in the box
  const [lit, setLit] = useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  useLayoutEffect(() => {
    const root = box.current
    if (!root) return
    const measure = () => {
      const a = root.getBoundingClientRect()
      const place = (i: number) => {
        const b = root
          .querySelector<HTMLElement>(`li[data-nav-index="${i}"] > button`)
          ?.getBoundingClientRect()
        return b
          ? { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height }
          : null
      }
      if (slot >= 0) {
        const p = place(slot)
        if (p)
          setAt({
            x: Math.round(p.x + p.w / 2),
            y: Math.round(p.y + p.h / 2),
          })
      }
      setLit(shownSlot === slot ? null : place(shownSlot))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [slot, shownSlot, items.length])
  const heroItem = hero >= 0 ? items[hero] : null
  // the open item's pill and the round main button: the candy yellow in both themes, with dark ink on it
  const heroColor = "#fbbf24"
  const activeInk = "#10142c"
  const HeroIcon = heroItem?.icon

  return (
    <div className="mobile-nav pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 flex justify-center px-3 lg:hidden">
      <div ref={box} className="pointer-events-auto relative w-full">
        <GlassSurface
          width="100%"
          height={56}
          borderRadius={28}
          backgroundOpacity={mode === "dark" ? 0.35 : 0.55}
          saturation={1}
          className="mobile-nav__glass"
          style={{ colorScheme: mode }}
        >
          {lit && (
            <span
              aria-hidden
              className="absolute rounded-full shadow-md transition-all duration-500 ease-[cubic-bezier(.3,1.4,.5,1)]"
              style={{
                left: lit.x,
                top: lit.y,
                width: lit.w,
                height: lit.h,
                background: heroColor,
              }}
            />
          )}
          <nav aria-label={t("nav.menu")} className="relative w-full">
            <ul className="flex w-full items-center gap-0.5">
              {order.map((o, i) => {
                const item = items[o]
                const { label, icon: Icon, iconOnly } = item
                const on = i === shownSlot && o !== hero
                const dot = item.id === "account" && attention
                return (
                  <li
                    key={item.id ?? i}
                    data-nav-index={i}
                    className="min-w-0 flex-1"
                  >
                    {o === hero ? (
                      // an empty slot as wide as the round button's foot
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={label}
                        className="block h-10 w-full"
                        onClick={() => item.onSelect()}
                      />
                    ) : (
                      <button
                        type="button"
                        aria-current={on ? "page" : undefined}
                        aria-label={
                          iconOnly
                            ? dot
                              ? `${label} (${t("emailVerify.dotLabel")})`
                              : label
                            : undefined
                        }
                        onClick={() => item.onSelect()}
                        className={cn(
                          "flex h-10 w-full items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-medium whitespace-nowrap transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          !on &&
                            (mode === "dark"
                              ? "text-white/75 hover:text-white"
                              : "text-zinc-700 hover:text-zinc-950"),
                        )}
                        style={on ? { color: activeInk } : undefined}
                      >
                        {Icon && (
                          <span className="relative inline-flex shrink-0">
                            <Icon className="size-[1.15em]" />
                            {dot && (
                              <AttentionDot className="-top-1 -right-1.5" />
                            )}
                          </span>
                        )}
                        {!iconOnly && <span className="truncate">{label}</span>}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        </GlassSurface>
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
              color: activeInk,
            }}
          >
            {HeroIcon && <HeroIcon className="size-7" />}
          </button>
        )}
      </div>
    </div>
  )
}
