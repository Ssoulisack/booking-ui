import type { LucideIcon } from "lucide-react"

import { colord } from "colord"

import GooeyNav from "@/components/reactbits/GooeyNav"

import { usePubMode } from "./theme"

export interface MobileNavItem {
  label: string
  icon?: LucideIcon
  // only the icon shows (saves width); the label stays as its accessible name
  iconOnly?: boolean
  onSelect: () => void
}

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
          activeIndex={active}
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
