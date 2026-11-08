import type { FloorItem, ZoneColor } from "@/types/floor-plan"
import { footprint, zoneOutline } from "@/lib/floor-plan"
import { cn } from "@/lib/utils"

import { isLZone, ZONE_SVG } from "./look"

/**
 * The shape of an L zone: a dashed outline with a light fill, drawn inside the zone's box (nothing for any other
 * zone, which is its box). The shape takes the clicks, so the cut-out corner stays free for what stands there.
 */
export function ZoneOutline({ zone }: { zone: FloorItem }) {
  const points = isLZone(zone) ? zoneOutline(zone) : null
  if (!points) return null
  const f = footprint(zone)
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-px">
      <svg
        viewBox={`0 0 ${f.w} ${f.h}`}
        preserveAspectRatio="none"
        className="size-full overflow-visible"
      >
        <polygon
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          className={cn(
            "pointer-events-auto stroke-2 [stroke-dasharray:6_4]",
            ZONE_SVG[(zone.color || "green") as ZoneColor],
          )}
        />
      </svg>
    </span>
  )
}
