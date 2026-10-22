import { addDays } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"

import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { CalendarEntry, CalendarLane } from "@/lib/api/types"
import { dayIn, todayIn } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useSettings } from "../api"
import { useCalendar } from "./api"
import { BookingSheet } from "./BookingSheet"
import { NewBookingDialog, type NewBookingStart } from "./NewBookingDialog"

const HOUR_PX = 56

const shiftDay = (ymd: string, days: number, tz: string) =>
  formatInTimeZone(
    addDays(fromZonedTime(`${ymd}T12:00:00`, tz), days),
    tz,
    "yyyy-MM-dd",
  )

/** Minutes after midnight of `ymd`, in the business time zone (clamped to that day) */
function minuteOf(iso: string, ymd: string, tz: string) {
  const day = formatInTimeZone(iso, tz, "yyyy-MM-dd")
  if (day < ymd) return 0
  if (day > ymd) return 24 * 60
  const [h, m] = formatInTimeZone(iso, tz, "HH:mm").split(":").map(Number)
  return h * 60 + m
}

interface Column {
  key: string
  label: string
  date: string
  lane: CalendarLane
}

/** /dashboard/:id/calendar — the day per court and coach, or one court's week */
export function CalendarPage() {
  const { t } = useTranslation()
  const settings = useSettings()
  const tz = settings.data?.in_force.timezone ?? "Asia/Vientiane"
  const [params, setParams] = useSearchParams()
  const date = params.get("date") ?? todayIn(tz)
  const view = params.get("view") === "week" ? "week" : "day"
  const calendar = useCalendar(date, view === "week" ? 7 : 1)
  const [open, setOpen] = useState<number | null>(null)
  const [newBooking, setNewBooking] = useState<NewBookingStart | null>(null)

  const set = (patch: Record<string, string>) =>
    setParams({ ...Object.fromEntries(params), ...patch }, { replace: true })
  const lanes = calendar.data?.lanes ?? []
  const laneKey =
    params.get("lane") ??
    (lanes[0] ? `${lanes[0].owner_type}:${lanes[0].owner_id}` : "")
  const lane =
    lanes.find((l) => `${l.owner_type}:${l.owner_id}` === laneKey) ?? lanes[0]

  const columns: Column[] =
    view === "day"
      ? lanes.map((l) => ({
          key: `${l.owner_type}:${l.owner_id}`,
          label: l.name,
          date,
          lane: l,
        }))
      : lane
        ? Array.from({ length: 7 }, (_, i) => {
            const d = shiftDay(date, i, tz)
            return {
              key: d,
              label: dayIn(`${d}T12:00:00Z`, "UTC"),
              date: d,
              lane,
            }
          })
        : []

  // show 07:00–22:00, widened to fit anything booked outside it
  let first = 7 * 60
  let last = 22 * 60
  for (const c of columns) {
    for (const e of c.lane.entries) {
      if (formatInTimeZone(e.starts_at, tz, "yyyy-MM-dd") !== c.date) continue
      first = Math.min(first, minuteOf(e.starts_at, c.date, tz))
      last = Math.max(last, minuteOf(e.ends_at, c.date, tz))
    }
  }
  const startHour = Math.floor(first / 60)
  const endHour = Math.min(24, Math.ceil(last / 60))
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-semibold tracking-tight">
          {t("nav.calendar")}
        </h1>
        <Button className="h-11 lg:h-9" onClick={() => setNewBooking({ date })}>
          <PlusIcon />
          {t("desk.newBooking")}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon-lg"
          className="size-11 lg:size-9"
          aria-label={t("desk.previous")}
          onClick={() =>
            set({ date: shiftDay(date, view === "week" ? -7 : -1, tz) })
          }
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          className="h-11 lg:h-9"
          onClick={() => set({ date: todayIn(tz) })}
        >
          {t("desk.today")}
        </Button>
        <Button
          variant="outline"
          size="icon-lg"
          className="size-11 lg:size-9"
          aria-label={t("desk.next")}
          onClick={() =>
            set({ date: shiftDay(date, view === "week" ? 7 : 1, tz) })
          }
        >
          <ChevronRightIcon />
        </Button>
        <Input
          type="date"
          aria-label={t("setup.classes.date")}
          value={date}
          onChange={(e) => e.target.value && set({ date: e.target.value })}
          className="h-11 w-40 lg:h-9"
        />
        <span className="font-medium">{dayIn(`${date}T12:00:00Z`, "UTC")}</span>
        <div
          role="radiogroup"
          aria-label={t("desk.view")}
          className="ml-auto flex rounded-lg bg-muted p-1"
        >
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => set({ view: v })}
              className={cn(
                "h-9 rounded-md px-3 text-sm font-medium lg:h-7",
                view === v
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {t(`desk.views.${v}`)}
            </button>
          ))}
        </div>
        {view === "week" && lanes.length > 0 && (
          <Select value={laneKey} onValueChange={(v) => set({ lane: v })}>
            <SelectTrigger
              aria-label={t("desk.lane")}
              className="h-11 w-44 lg:h-9"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lanes.map((l) => (
                <SelectItem
                  key={`${l.owner_type}:${l.owner_id}`}
                  value={`${l.owner_type}:${l.owner_id}`}
                >
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {calendar.isPending || settings.isPending ? (
        <Skeleton className="h-[60dvh] rounded-xl" />
      ) : calendar.isError ? (
        <PageError error={calendar.error} onRetry={() => calendar.refetch()} />
      ) : columns.length === 0 ? (
        <p className="rounded-xl bg-background p-6 text-muted-foreground ring-1 ring-border">
          {t("desk.noLanes")}
        </p>
      ) : (
        <div
          className={cn(
            "overflow-x-auto rounded-xl bg-background ring-1 ring-border",
            calendar.isPlaceholderData && "opacity-60",
          )}
        >
          <div className="flex min-w-max">
            <div className="sticky left-0 z-10 w-14 shrink-0 border-r bg-background">
              <div className="h-12 border-b" />
              {hours.map((h) => (
                <div
                  key={h}
                  style={{ height: HOUR_PX }}
                  className="-translate-y-2 pr-2 text-right text-xs text-muted-foreground tabular-nums"
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {columns.map((col) => (
              <LaneColumn
                key={col.key}
                column={col}
                tz={tz}
                startHour={startHour}
                hours={hours.length}
                today={col.date === todayIn(tz)}
                onOpen={setOpen}
                onNew={() =>
                  setNewBooking({
                    date: col.date,
                    resource_id:
                      col.lane.owner_type === "resource"
                        ? col.lane.owner_id
                        : undefined,
                    coach_id:
                      col.lane.owner_type === "coach"
                        ? col.lane.owner_id
                        : undefined,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}
      <Legend />
      <BookingSheet id={open} onClose={() => setOpen(null)} />
      {newBooking && (
        <NewBookingDialog
          start={newBooking}
          onClose={() => setNewBooking(null)}
          onCreated={(b) => {
            setNewBooking(null)
            setOpen(b.id)
          }}
        />
      )}
    </div>
  )
}

function LaneColumn({
  column,
  tz,
  startHour,
  hours,
  today,
  onOpen,
  onNew,
}: {
  column: Column
  tz: string
  startHour: number
  hours: number
  today: boolean
  onOpen: (id: number) => void
  onNew: () => void
}) {
  const { t } = useTranslation()
  const [now] = useState(() => new Date().toISOString())
  const top = (iso: string) =>
    ((minuteOf(iso, column.date, tz) - startHour * 60) / 60) * HOUR_PX
  const entries = column.lane.entries.filter(
    (e) =>
      minuteOf(e.ends_at, column.date, tz) > 0 &&
      minuteOf(e.starts_at, column.date, tz) < 24 * 60,
  )
  return (
    <div className="w-40 shrink-0 border-r last:border-r-0 lg:w-48">
      <div
        className={cn(
          "flex h-12 items-center justify-center border-b px-2 text-center text-sm font-medium",
          today && "text-primary",
        )}
      >
        <span className="truncate">{column.label}</span>
      </div>
      <div className="relative" style={{ height: hours * HOUR_PX }}>
        {Array.from({ length: hours }, (_, i) => (
          <div
            key={i}
            style={{ top: i * HOUR_PX }}
            className="absolute inset-x-0 border-t border-dashed border-border/70"
          />
        ))}
        {/* free space: start a booking for this court or coach */}
        <button
          type="button"
          aria-label={t("desk.newBookingFor", { name: column.lane.name })}
          onClick={onNew}
          className="absolute inset-0 hover:bg-muted/40"
        />
        {today && (
          <div
            style={{ top: top(now) }}
            className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-rose-500"
          />
        )}
        {entries.map((e, i) => (
          <Block
            key={i}
            entry={e}
            tz={tz}
            top={top(e.starts_at)}
            height={Math.max(top(e.ends_at) - top(e.starts_at), 22)}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  )
}

const STATUS_COLOR: Record<string, string> = {
  pending: "border-amber-400 bg-amber-50 text-amber-950",
  confirmed: "border-sky-500 bg-sky-50 text-sky-950",
  completed: "border-zinc-400 bg-zinc-100 text-zinc-700",
  no_show: "border-rose-400 bg-rose-50 text-rose-900",
}

function Block({
  entry: e,
  tz,
  top,
  height,
  onOpen,
}: {
  entry: CalendarEntry
  tz: string
  top: number
  height: number
  onOpen: (id: number) => void
}) {
  const { t } = useTranslation()
  const time = `${formatInTimeZone(e.starts_at, tz, "HH:mm")}–${formatInTimeZone(e.ends_at, tz, "HH:mm")}`
  const box =
    "absolute inset-x-1 z-[5] overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left text-xs"
  if (e.kind === "booking") {
    return (
      <button
        type="button"
        onClick={() => e.booking_id && onOpen(e.booking_id)}
        style={{ top, height }}
        className={cn(
          box,
          STATUS_COLOR[e.status ?? "confirmed"],
          "hover:brightness-95",
        )}
      >
        <span className="flex items-center justify-between gap-1 font-medium">
          <span className="truncate">{e.name || e.code}</span>
          {e.paid && (
            <span
              aria-label={t("desk.paid")}
              className="shrink-0 rounded bg-emerald-600 px-1 text-[10px] text-white"
            >
              {t("desk.paidShort")}
            </span>
          )}
        </span>
        <span className="block tabular-nums opacity-80">{time}</span>
      </button>
    )
  }
  if (e.kind === "class") {
    return (
      <div
        style={{ top, height }}
        className={cn(box, "border-violet-500 bg-violet-50 text-violet-950")}
      >
        <span className="block truncate font-medium">{e.title}</span>
        <span className="block tabular-nums opacity-80">
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
      style={{ top, height }}
      className={cn(
        box,
        "border-zinc-400 bg-[repeating-linear-gradient(45deg,var(--color-muted),var(--color-muted)_6px,transparent_6px,transparent_12px)] text-zinc-700",
      )}
    >
      <span className="block truncate font-medium">
        {e.reason || t("setup.closures.closed")}
      </span>
    </div>
  )
}

function Legend() {
  const { t } = useTranslation()
  const items = [
    ["border-sky-500 bg-sky-50", t("booking.status.confirmed")],
    ["border-amber-400 bg-amber-50", t("booking.status.pending")],
    ["border-zinc-400 bg-zinc-100", t("booking.status.completed")],
    ["border-rose-400 bg-rose-50", t("booking.status.no_show")],
    ["border-violet-500 bg-violet-50", t("desk.legendClass")],
  ]
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(([cls, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cn("h-3 w-5 rounded-sm border-l-4", cls)} />
          {label}
        </li>
      ))}
    </ul>
  )
}
