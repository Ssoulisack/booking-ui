import type { LucideIcon } from "lucide-react"

import GooeyNav from "@/components/reactbits/GooeyNav"

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
}: {
  items: MobileNavItem[]
  active: number
  color?: string
}) {
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
          theme="light"
          color={color}
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
