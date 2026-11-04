import { formatInTimeZone } from "date-fns-tz"
import { CheckIcon, UsersIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import type { CalendarEntry, CalendarLane } from "@/lib/api/types"
import { cn } from "@/lib/utils"

import {
  matches,
  minuteOf,
  SIZES,
  STATUS_COLOR,
  type Density,
  type LaneGroup,
} from "./lanes"

const NAME_W = 160
const laneKey = (l: CalendarLane) => `${l.owner_type}:${l.owner_id}`
const hhmm = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`

/**
 * One row per court, coach or table, time across: fits 10+ courts or 50 tables. The names and
 * the hours stay in place while scrolling; a red line marks now.
 */
export function Timeline({
  groups,
  date,
  tz,
  today,
  density,
  search,
  scrollToNow,
  onOpen,
  onNew,
}: {
  groups: LaneGroup[]
  date: string
  tz: string
  today: boolean
  density: Density
  search: string
  /** bumped by "Now": scroll the timeline to the current time */
  scrollToNow: number
  onOpen: (id: number) => void
  /** tap on a free stretch; not given = no new bookings from here */
  onNew?: (lane: CalendarLane, time: string) => void
}) {
  const { t } = useTranslation()
  const scroller = useRef<HTMLDivElement>(null)
  const [folded, setFolded] = useState<string[]>([])
  const [now] = useState(() => new Date().toISOString())
  const size = SIZES[density]

  // show 07:00–23:00, widened to fit anything booked outside it
  let first = 7 * 60
  let last = 23 * 60
  for (const g of groups)
    for (const l of g.lanes)
      for (const e of l.entries) {
        if (e.kind === "closure") continue
        first = Math.min(first, minuteOf(e.starts_at, date, tz))
        last = Math.max(last, minuteOf(e.ends_at, date, tz))
      }
  const startHour = Math.floor(first / 60)
  const endHour = Math.min(24, Math.max(startHour + 1, Math.ceil(last / 60)))
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  )
  const x = (minute: number) => ((minute - startHour * 60) / 60) * size.hour
  const nowX = x(minuteOf(now, date, tz))
  const nowShown = today && nowX >= 0 && nowX <= hours.length * size.hour

  // today: open on the current time (and again whenever "Now" is pressed)
  useEffect(() => {
    if (!nowShown || !scroller.current) return
    scroller.current.scrollTo({
      left: Math.max(0, nowX - size.hour),
      behavior: scrollToNow ? "smooth" : "auto",
    })
  }, [scrollToNow, nowShown, nowX, size.hour])

  const width = hours.length * size.hour

  return (
    <div
      ref={scroller}
      className="max-h-[70dvh] overflow-auto rounded-xl bg-background ring-1 ring-border"
    >
      <div className="relative" style={{ width: NAME_W + width }}>
        {/* hours, kept at the top while scrolling down */}
        <div className="sticky top-0 z-30 flex h-9 border-b bg-background">
          <div
            className="sticky left-0 z-40 shrink-0 border-r bg-background"
            style={{ width: NAME_W }}
          />
          {hours.map((h) => (
            <div
              key={h}
              style={{ width: size.hour }}
              className="shrink-0 border-l px-1.5 pt-2 text-xs text-muted-foreground tabular-nums"
            >
              {hhmm(h * 60)}
            </div>
          ))}
        </div>

        <div className="relative">
          {nowShown && (
            <div
              aria-hidden
              style={{ left: NAME_W + nowX }}
              className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-rose-500"
            />
          )}
          {groups.map((g) => {
            const closed = folded.includes(g.key)
            return (
              <section key={g.key}>
                <div className="flex h-8 items-center border-b bg-muted/60">
                  <button
                    type="button"
                    aria-expanded={!closed}
                    onClick={() =>
                      setFolded((f) =>
                        closed ? f.filter((k) => k !== g.key) : [...f, g.key],
                      )
                    }
                    className="sticky left-0 flex h-8 items-center gap-1.5 px-2 text-sm font-semibold"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "inline-block transition-transform",
                        closed ? "-rotate-90" : "",
                      )}
                    >
                      ▾
                    </span>
                    {g.label}
                    <span className="font-normal text-muted-foreground">
                      {g.lanes.length}
                    </span>
                  </button>
                </div>
                {!closed &&
                  g.lanes.map((lane) => (
                    <Row
                      key={laneKey(lane)}
                      lane={lane}
                      date={date}
                      tz={tz}
                      size={size}
                      width={width}
                      x={x}
                      search={search}
                      startHour={startHour}
                      onOpen={onOpen}
                      onNew={onNew}
                      seatsLabel={
                        lane.seats > 0
                          ? t("desk.seatsShort", { count: lane.seats })
                          : undefined
                      }
                    />
                  ))}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Row({
  lane,
  date,
  tz,
  size,
  width,
  x,
  search,
  startHour,
  seatsLabel,
  onOpen,
  onNew,
}: {
  lane: CalendarLane
  date: string
  tz: string
  size: { hour: number; row: number }
  width: number
  x: (minute: number) => number
  search: string
  startHour: number
  seatsLabel?: string
  onOpen: (id: number) => void
  onNew?: (lane: CalendarLane, time: string) => void
}) {
  const { t } = useTranslation()
  const entries = lane.entries.filter(
    (e) =>
      minuteOf(e.ends_at, date, tz) > 0 &&
      minuteOf(e.starts_at, date, tz) < 24 * 60,
  )
  return (
    <div className="flex border-b" style={{ height: size.row }}>
      <div
        className="sticky left-0 z-20 flex shrink-0 flex-col justify-center border-r bg-background px-2"
        style={{ width: NAME_W }}
      >
        <span className="truncate text-sm font-medium">{lane.name}</span>
        {seatsLabel && (
          <span className="truncate text-xs text-muted-foreground">
            {seatsLabel}
          </span>
        )}
      </div>
      <div
        className={cn("relative shrink-0", onNew && "cursor-pointer")}
        style={{
          width,
          // a line every half hour, darker on the hour
          backgroundImage: `repeating-linear-gradient(to right, var(--color-border) 0 1px, transparent 1px ${size.hour}px), repeating-linear-gradient(to right, color-mix(in oklab, var(--color-border) 45%, transparent) 0 1px, transparent 1px ${size.hour / 2}px)`,
        }}
        // a free stretch: a new booking for this court or coach, starting at the half hour tapped
        onClick={
          onNew
            ? (ev) => {
                const box = ev.currentTarget.getBoundingClientRect()
                const minute =
                  startHour * 60 +
                  Math.floor(((ev.clientX - box.left) / size.hour) * 2) * 30
                onNew(lane, hhmm(minute))
              }
            : undefined
        }
        aria-label={
          onNew ? t("desk.newBookingFor", { name: lane.name }) : undefined
        }
      >
        {entries.map((e, i) => {
          const left = x(minuteOf(e.starts_at, date, tz))
          const w = Math.max(x(minuteOf(e.ends_at, date, tz)) - left, 24)
          return (
            <Block
              key={i}
              entry={e}
              tz={tz}
              left={left}
              width={w}
              dim={!!search && !matches(e, search)}
              onOpen={onOpen}
            />
          )
        })}
      </div>
    </div>
  )
}

function Block({
  entry: e,
  tz,
  left,
  width,
  dim,
  onOpen,
}: {
  entry: CalendarEntry
  tz: string
  left: number
  width: number
  dim: boolean
  onOpen: (id: number) => void
}) {
  const { t } = useTranslation()
  const time = `${formatInTimeZone(e.starts_at, tz, "HH:mm")}–${formatInTimeZone(e.ends_at, tz, "HH:mm")}`
  const box = cn(
    "absolute inset-y-1 z-[5] flex min-w-0 flex-col justify-center overflow-hidden rounded-md border-l-4 px-1.5 text-left text-xs leading-tight",
    dim && "opacity-30",
  )
  const style = { left, width }
  if (e.kind === "booking") {
    return (
      <button
        type="button"
        title={`${e.name || e.code} · ${time}`}
        onClick={(ev) => {
          ev.stopPropagation()
          if (e.booking_id) onOpen(e.booking_id)
        }}
        style={style}
        className={cn(
          box,
          STATUS_COLOR[e.status ?? "confirmed"],
          "hover:brightness-95",
        )}
      >
        <span className="flex items-center gap-1 font-medium">
          {e.arrived && (
            <CheckIcon
              aria-label={t("desk.arrived")}
              className="size-3.5 shrink-0 text-emerald-700 dark:text-emerald-300"
            />
          )}
          <span className="truncate">{e.name || e.code}</span>
          {!!e.guests && (
            <span className="flex shrink-0 items-center gap-0.5 opacity-80">
              <UsersIcon className="size-3" />
              {e.guests}
            </span>
          )}
          {e.paid && (
            <span
              aria-label={t("desk.paid")}
              className="shrink-0 rounded bg-emerald-600 px-1 text-[10px] text-white"
            >
              {t("desk.paidShort")}
            </span>
          )}
        </span>
        <span className="truncate tabular-nums opacity-80">{time}</span>
      </button>
    )
  }
  if (e.kind === "class") {
    return (
      <div
        style={style}
        onClick={(ev) => ev.stopPropagation()}
        className={cn(
          box,
          "border-violet-500 bg-violet-50 text-violet-950 dark:bg-violet-400/15 dark:text-violet-200",
        )}
      >
        <span className="truncate font-medium">{e.title}</span>
        <span className="truncate tabular-nums opacity-80">
          {time} ·{" "}
          {t("desk.seatsTaken", {
            taken: e.seats_taken ?? 0,
            capacity: e.capacity ?? 0,
          })}
        </span>
      </div>
    )
  }
  return (
    <div
      style={style}
      onClick={(ev) => ev.stopPropagation()}
      className={cn(
        box,
        "border-zinc-400 bg-[repeating-linear-gradient(45deg,var(--color-muted),var(--color-muted)_6px,transparent_6px,transparent_12px)] text-zinc-700 dark:border-zinc-400/50 dark:text-zinc-300",
      )}
    >
      <span className="truncate font-medium">
        {e.reason || t("setup.closures.closed")}
      </span>
    </div>
  )
}

/**
 * Phones: the day as a list by start time ("18:00 · 3 bookings"), each booking once even when it
 * uses several tables or a court and a coach.
 */
export function AgendaList({
  groups,
  tz,
  search,
  onOpen,
}: {
  groups: LaneGroup[]
  tz: string
  search: string
  onOpen: (id: number) => void
}) {
  const { t } = useTranslation()
  const items = new Map<string, { e: CalendarEntry; where: string[] }>()
  for (const g of groups)
    for (const l of g.lanes)
      for (const e of l.entries) {
        if (e.kind === "closure" || !matches(e, search)) continue
        const key = e.kind === "booking" ? `b${e.booking_id}` : `c${e.class_id}`
        const item = items.get(key) ?? { e, where: [] }
        item.where.push(l.name)
        items.set(key, item)
      }
  const list = [...items.values()].sort((a, b) =>
    a.e.starts_at.localeCompare(b.e.starts_at),
  )
  if (list.length === 0) {
    return (
      <p className="rounded-xl bg-background p-6 text-center text-muted-foreground ring-1 ring-border">
        {search ? t("desk.noMatch") : t("desk.agendaEmpty")}
      </p>
    )
  }
  const byHour = new Map<string, typeof list>()
  for (const item of list) {
    const hour = `${formatInTimeZone(item.e.starts_at, tz, "HH")}:00`
    byHour.set(hour, [...(byHour.get(hour) ?? []), item])
  }
  return (
    <div className="space-y-4">
      {[...byHour.entries()].map(([hour, rows]) => (
        <section key={hour} className="space-y-2">
          <h3 className="text-sm font-semibold">
            {hour}{" "}
            <span className="font-normal text-muted-foreground">
              · {t("desk.bookingsCount", { count: rows.length })}
            </span>
          </h3>
          {rows.map(({ e, where }) => {
            const time = `${formatInTimeZone(e.starts_at, tz, "HH:mm")}–${formatInTimeZone(e.ends_at, tz, "HH:mm")}`
            const body = (
              <>
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 font-medium">
                    {e.arrived && (
                      <CheckIcon
                        aria-label={t("desk.arrived")}
                        className="size-4 shrink-0 text-emerald-700 dark:text-emerald-300"
                      />
                    )}
                    <span className="truncate">
                      {e.kind === "class" ? e.title : e.name || e.code}
                    </span>
                    {!!e.guests && (
                      <span className="flex shrink-0 items-center gap-0.5 text-sm text-muted-foreground">
                        <UsersIcon className="size-3.5" />
                        {e.guests}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">{time}</span>
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {where.join(" + ")}
                  {e.kind === "class" &&
                    ` · ${t("desk.seatsTaken", { taken: e.seats_taken ?? 0, capacity: e.capacity ?? 0 })}`}
                </span>
              </>
            )
            const box = cn(
              "block w-full rounded-lg border-l-4 px-3 py-2 text-left",
              e.kind === "class"
                ? "border-violet-500 bg-violet-50 dark:bg-violet-400/15 text-violet-950 dark:text-violet-200"
                : STATUS_COLOR[e.status ?? "confirmed"],
            )
            return e.kind === "booking" ? (
              <button
                key={`b${e.booking_id}`}
                type="button"
                className={cn(box, "min-h-11 active:brightness-95")}
                onClick={() => e.booking_id && onOpen(e.booking_id)}
              >
                {body}
              </button>
            ) : (
              <div key={`c${e.class_id}`} className={box}>
                {body}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
