import { useSyncExternalStore } from "react"

import MagicRings from "@/components/reactbits/MagicRings"

import { ringColors } from "./brand"

const WIDE = "(min-width: 1024px)"
const watchWide = (notify: () => void) => {
  const query = window.matchMedia(WIDE)
  query.addEventListener("change", notify)
  return () => query.removeEventListener("change", notify)
}

/**
 * React Bits MagicRings filling the whole brand header (home and branch pages), in the chosen ring
 * colours or tints of the brand colour. A little faded so the name stays readable; a tap in the
 * header sends a ring outward.
 */
export function BrandRings({
  brand,
  colors,
  compact = false,
}: {
  brand: string | undefined
  // the chosen ring colours (up to 4); empty: made from the brand colour
  colors?: string[]
  // a small box (the settings preview): keep the rings close however wide the screen is
  compact?: boolean
}) {
  const auto = ringColors(brand)
  // a wide header is much wider than tall: space the rings further apart so they reach its edges
  const wide = useSyncExternalStore(
    watchWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  )
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-80"
    >
      <MagicRings
        {...auto}
        colors={colors && colors.length > 0 ? colors : undefined}
        motion="pulse"
        ringCount={9}
        radiusStep={wide && !compact ? 0.36 : 0.16}
        lineThickness={2}
        glow={1}
        parallax={0.03}
      />
    </div>
  )
}
