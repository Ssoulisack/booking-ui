import { FootprintsIcon, ZoomInIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  ITEM_ICONS,
  itemLook,
  iconSize,
} from "@/components/global/floor-plan/look"
import type { FloorItem, PublicArea } from "@/types/floor-plan"
import { footprint } from "@/lib/floor-plan"
import { ZoneOutline } from "@/components/global/floor-plan/ZoneOutline"
import { cn } from "@/lib/utils"

/** A table on the team's plan: free, taken (a group sits there) or booked (a group is coming) */
export interface StaffTable {
  tone:
    | "free"
    | "taken"
    | "booked"
    | "kept"
    | "confirmed" // booked and settled: a normal booking the team approved, or an event booking paid and confirmed
    | "unpaid" // an event booking holding the table until it is paid
    | "slip" // the customer says they paid (slip sent): the team must check it
    | "chosen" // picked in a form: this is the table the team is choosing
    | "review" // needs the team: paid but not confirmed, or confirmed but not paid
  /** a short line under the name on the table: the customer's name (short) */
  note?: string
  /** the full story for the tooltip and screen readers: state, time, full name */
  detail?: string
}

const STAFF_TONE: Record<StaffTable["tone"], string> = {
  free: "border-[var(--brand)]/60 bg-card text-foreground shadow-sm active:bg-[var(--brand-soft)]",
  taken: "border-rose-600 bg-rose-500 text-white shadow-sm",
  booked: "border-dashed border-amber-500 bg-amber-50 text-amber-950",
  confirmed: "border-emerald-600 bg-emerald-500 text-white shadow-sm",
  unpaid:
    "border-dashed border-amber-500 bg-amber-100 text-amber-950 shadow-sm",
  slip: "border-violet-500 bg-violet-100 text-violet-950 shadow-sm ring-2 ring-violet-400/60",
  chosen:
    "border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40",
  review:
    "border-orange-600 bg-orange-100 text-orange-950 shadow-sm ring-2 ring-orange-500",
  // kept for walk-ins: free for the desk to seat, not bookable online
  kept: "border-sky-500 bg-sky-50 text-sky-950 shadow-sm active:bg-sky-100",
}

// what customers see on a table kept for walk-ins: not taken, not pickable
const KEPT_LOOK =
  "cursor-not-allowed border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200"

/**
 * A restaurant area's plan for customers: zones behind, objects (bar, stage, toilet, stairs…)
 * for finding the way, and the tables: free ones can be tapped, taken ones are grey. Tapping
 * stairs that lead to another floor opens it.
 */
export function TablePlan({
  area,
  free,
  chosen,
  onToggle,
  onStairs,
  staffLook,
  priceLabel,
  tint,
  kept: keptIds,
  highlight,
  onZone,
}: {
  area: PublicArea
  free: Set<number>
  chosen: Set<number>
  onToggle: (id: number) => void
  onStairs: (floor: number) => void
  /** the team's plan: every table can be tapped, coloured by what it is doing now */
  staffLook?: (id: number) => StaffTable
  /** event days: a short price under the table's name (instead of its seats) */
  priceLabel?: (id: number) => string | undefined
  /** event days: tables of one price share a colour (any CSS colour) */
  tint?: (id: number) => string | undefined
  /** tables kept for walk-ins that the availability answer names (the plan itself may be a little older) */
  kept?: Set<number>
  /** tables to point at (a search): a blue ring */
  highlight?: Set<number>
  /** customers: a tap on a zone opens it on its own, bigger (tables in it are still tapped as usual) */
  onZone?: (zone: FloorItem) => void
}) {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const [cell, setCell] = useState(0)
  // a walk-in table shows only its icon; hover (or a tap on a phone) shows what it means in a small bubble
  const [tip, setTip] = useState<number | null>(null)
  useEffect(() => {
    if (tip === null) return
    const id = window.setTimeout(() => setTip(null), 2500)
    return () => window.clearTimeout(id)
  }, [tip])
  const W = area.plan_width
  const H = area.plan_height

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setCell(el.clientWidth / W)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [W])

  const place = (p: Parameters<typeof footprint>[0]) => {
    const f = footprint(p)
    return {
      left: f.x * cell,
      top: f.y * cell,
      width: f.w * cell,
      height: f.h * cell,
    }
  }
  const zones = area.items.filter((i) => i.kind === "zone")
  const objects = area.items.filter((i) => i.kind !== "zone")

  return (
    <div
      ref={box}
      className="relative w-full overflow-hidden rounded-xl bg-card ring-1 ring-border"
      style={{
        aspectRatio: `${W} / ${H}`,
        backgroundImage:
          "radial-gradient(circle, rgb(0 0 0 / 0.07) 1px, transparent 1px)",
        backgroundSize: `${cell}px ${cell}px`,
      }}
    >
      {zones.map((z) =>
        onZone ? (
          <button
            key={`z${z.id}`}
            type="button"
            aria-label={t("public.tables.zoomZone", { zone: z.label })}
            onClick={() => onZone(z)}
            className={cn(
              "absolute flex text-left text-[11px] leading-tight font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring sm:text-xs",
              itemLook(z),
            )}
            style={place(z)}
          >
            <ZoneOutline zone={z} />
            <span className="relative flex min-w-0 items-center gap-1">
              <ZoomInIcon className="size-3.5 shrink-0" />
              <span className="truncate">{z.label}</span>
            </span>
          </button>
        ) : (
          <div
            key={`z${z.id}`}
            aria-hidden
            className={cn(
              "absolute flex text-[11px] leading-tight font-medium sm:text-xs",
              itemLook(z),
            )}
            style={place(z)}
          >
            <ZoneOutline zone={z} />
            <span className="relative truncate">{z.label}</span>
          </div>
        ),
      )}

      {area.tables.map((table) => {
        const isFree = free.has(table.id)
        const isChosen = chosen.has(table.id)
        const f = footprint(table)
        const staff = staffLook?.(table.id)
        const color = isFree && !isChosen ? tint?.(table.id) : undefined
        // a table kept for walk-ins is said so (it is not "taken")
        const kept =
          (!!table.walk_in_only || !!keptIds?.has(table.id)) &&
          !staff &&
          !isFree
        return (
          <button
            key={table.id}
            type="button"
            // a walk-in table stays tappable for its bubble (a disabled button gets no hover or tap), never chosen
            disabled={!isFree && !staff && !kept}
            aria-disabled={kept || undefined}
            aria-pressed={staff ? undefined : isChosen}
            aria-label={
              staff
                ? `${table.name} · ${t(`tonight.${staff.tone}`)}${staff.detail || staff.note ? ` · ${staff.detail ?? staff.note}` : ""}`
                : kept
                  ? t("public.tables.tableKept", { name: table.name })
                  : t(
                      isFree
                        ? "public.tables.tableFree"
                        : "public.tables.tableTaken",
                      { name: table.name, count: table.seats },
                    )
            }
            title={
              staff
                ? `${table.name} · ${t(`tonight.${staff.tone}`)}${staff.detail ? ` · ${staff.detail}` : ""}`
                : undefined
            }
            onClick={() => (kept ? setTip(table.id) : onToggle(table.id))}
            onMouseEnter={kept ? () => setTip(table.id) : undefined}
            onMouseLeave={kept ? () => setTip(null) : undefined}
            className={cn(
              "absolute z-10 flex flex-col items-center justify-center overflow-hidden border-2 text-center leading-tight transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
              table.shape === "round" ? "rounded-full" : "rounded-lg",
              staff
                ? STAFF_TONE[staff.tone]
                : isChosen
                  ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)] shadow-md"
                  : isFree
                    ? "border-[var(--brand)]/60 bg-card text-foreground shadow-sm active:bg-[var(--brand-soft)]"
                    : kept
                      ? KEPT_LOOK
                      : "cursor-not-allowed border-dashed border-border bg-muted text-muted-foreground",
              highlight?.has(table.id) &&
                "z-20 ring-3 ring-sky-500 ring-offset-2 ring-offset-background",
            )}
            style={{
              ...place(table),
              ...(color
                ? {
                    borderColor: color,
                    backgroundColor: `color-mix(in srgb, ${color} 18%, var(--card))`,
                  }
                : {}),
            }}
          >
            {kept ? (
              // walk-in only: just the icon, centred (no number; the bubble on hover / tap names the table)
              <FootprintsIcon
                aria-hidden
                className="shrink-0 opacity-80"
                style={{
                  width: Math.max(
                    12,
                    Math.min(20, Math.min(f.w, f.h) * cell * 0.5),
                  ),
                  height: Math.max(
                    12,
                    Math.min(20, Math.min(f.w, f.h) * cell * 0.5),
                  ),
                }}
              />
            ) : (
              // a very narrow table on a phone: a smaller name, so "47" is not cut to "4…"
              <span
                className={cn(
                  "max-w-full truncate font-semibold",
                  f.w * cell < 30
                    ? "px-0 text-[9px] tracking-tighter sm:text-xs"
                    : "px-0.5 text-[11px] sm:text-sm",
                )}
              >
                {table.name}
              </span>
            )}
            {staff?.tone === "kept" && (
              <FootprintsIcon
                aria-hidden
                className="absolute top-0.5 right-0.5 size-3 opacity-70"
              />
            )}
            {/* small tables on a phone: just the number of seats under the name */}
            {f.h * cell > 30 && !kept && (
              <span className="text-[10px] leading-none opacity-80 sm:text-xs">
                {staff?.note
                  ? staff.note
                  : priceLabel?.(table.id)
                    ? priceLabel(table.id)
                    : f.w * cell >= 60
                      ? t("public.tables.seatsShort", { count: table.seats })
                      : table.seats}
              </span>
            )}
          </button>
        )
      })}

      {(() => {
        const at =
          tip === null ? undefined : area.tables.find((x) => x.id === tip)
        if (!at) return null
        const p = place(at)
        // above the table, or below it when it stands at the top of the plan
        const below = p.top < 44
        const half = Math.min(112, W * cell * 0.45)
        return (
          <div
            role="tooltip"
            className={cn(
              "pointer-events-none absolute z-30 w-max max-w-[min(14rem,90%)] -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-center text-xs leading-snug text-background shadow-lg",
              // above the table: lifted by its own height (one translate, so x and y do not add up twice)
              !below && "-translate-y-full",
            )}
            style={{
              // centred on the table, but never past the plan's edges: half the bubble's widest (14rem, or 90% of a
              // narrow plan) plus a little room on each side
              left: Math.min(
                Math.max(p.left + p.width / 2, half + 4),
                W * cell - half - 4,
              ),
              ...(below ? { top: p.top + p.height + 6 } : { top: p.top - 6 }),
            }}
          >
            <span className="font-semibold">{at.name}</span> ·{" "}
            {t("public.tables.keptTip")}
          </div>
        )
      })()}

      {objects.map((item) => {
        const Icon = ITEM_ICONS[item.kind]
        const f = footprint(item)
        const side = Math.min(f.w, f.h) * cell
        const named = item.kind === "label" || f.w * cell > 48
        // small on a phone: without room for the name the icon still shows (smaller), so a WC is never an empty box
        const content = (
          <>
            {item.kind !== "label" && (side > 28 || !named) && (
              <Icon
                className="shrink-0"
                style={{ width: iconSize(side), height: iconSize(side) }}
              />
            )}
            {named && <span className="truncate px-0.5">{item.label}</span>}
          </>
        )
        const look = cn(
          "absolute z-20 flex items-center justify-center gap-1 overflow-hidden border text-[11px] leading-tight font-medium sm:text-xs",
          itemLook(item),
        )
        // stairs to another floor open it
        if (item.kind === "stairs" && item.target_floor !== null) {
          return (
            <button
              key={`i${item.id}`}
              type="button"
              aria-label={t("public.tables.stairsTo", { label: item.label })}
              onClick={() => onStairs(item.target_floor!)}
              className={cn(
                look,
                "outline-none focus-visible:ring-3 focus-visible:ring-ring",
              )}
              style={place(item)}
            >
              {content}
            </button>
          )
        }
        return (
          <div
            key={`i${item.id}`}
            aria-hidden
            className={look}
            style={place(item)}
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}
