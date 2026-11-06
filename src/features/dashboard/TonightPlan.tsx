import { useQueryClient } from "@tanstack/react-query"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { currentItems } from "@/features/public/booking-utils"
import { Plans } from "@/features/public/TableBookingPanel"
import type { StaffTable } from "@/features/public/TablePlan"
import type {
  Booking,
  ManagedTable,
  PublicArea,
  PublicTable,
} from "@/lib/api/types"
import { timeIn, todayIn } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  manage,
  useAllFloorPlans,
  useBiz,
  useSettings,
  useSportsList,
} from "./api"
import { useBookingList, useChangeStatus, useWalkIn } from "./desk/api"
import { BookingSheet } from "./desk/BookingSheet"
import { Panel } from "./ui"

/**
 * The Overview's floor plan of a restaurant, for the team: every table as it is now — free,
 * taken (a group sits there) or booked (a group is coming today). Tap a free table to mark it
 * taken (no name or phone), a taken one to free it, a booked one for the booking.
 */
export function TonightPlan() {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const today = todayIn(tz)
  // the day shown: today, or a later day to check what is booked (nobody sits there yet)
  const [dayPick, setDayPick] = useState("")
  const day = dayPick && dayPick >= today ? dayPick : today
  const isToday = day === today
  const areas = useSportsList()
  const live = (areas.data ?? []).filter((a) => a.active)
  const plans = useAllFloorPlans(live.map((a) => a.id))
  const bookings = useBookingList({ from: day, to: day, limit: 100 })
  const [now] = useState(() => Date.now())
  const [floorPick, setFloorPick] = useState<number | null>(null)
  const [seat, setSeat] = useState<PublicTable | null>(null)
  const [freeing, setFreeing] = useState<{
    table: PublicTable
    booking: Booking
  } | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  if (areas.isPending || plans.some((p) => p.isPending) || bookings.isPending)
    return <Skeleton className="aspect-[5/3] w-full rounded-xl" />
  const failed = plans.find((p) => p.isError)
  if (failed) return <ErrorAlert error={failed.error} />

  // each table's group now (seated), else the next group coming today
  const seated = new Map<number, Booking>()
  const coming = new Map<number, Booking>()
  for (const b of bookings.data?.items ?? []) {
    if (b.status !== "pending" && b.status !== "confirmed") continue
    if (isToday && Date.parse(b.ends_at) <= now) continue
    for (const i of currentItems(b)) {
      const id = i.resource_id ?? 0
      if (isToday && b.arrived_at) seated.set(id, b)
      else if (
        !coming.has(id) ||
        b.starts_at < (coming.get(id)?.starts_at ?? "")
      )
        coming.set(id, b)
    }
  }
  const keptIds = new Set(
    plans.flatMap((p) =>
      (p.data?.tables ?? []).filter((x) => x.walk_in_only).map((x) => x.id),
    ),
  )
  // what a booked table needs from the team: an event table is paid and confirmed, or waiting for money, or the slip
  // must be checked; anything odd (paid but not confirmed, confirmed but not paid) is flagged
  const stateOf = (b: Booking): StaffTable => {
    const time = timeIn(b.arrive_by ?? b.starts_at, tz)
    const paid = b.payment_status === "paid"
    if (b.event_id) {
      if (b.status === "confirmed" && paid)
        return { tone: "confirmed", note: t("tonight.sConfirmed") }
      if (b.status === "pending" && paid)
        return { tone: "review", note: t("tonight.sPaidConfirm") }
      if (b.status === "confirmed")
        return { tone: "review", note: t("tonight.sConfirmedUnpaid") }
      if (b.slip_sent_at) return { tone: "slip", note: t("tonight.sSlip") }
      return { tone: "unpaid", note: t("tonight.sUnpaid") }
    }
    // a normal booking: waiting for the team's approval, or approved
    if (b.status === "pending")
      return { tone: "booked", note: `${time} · ${t("tonight.sApprove")}` }
    return { tone: "booked", note: time }
  }
  const look = (id: number): StaffTable => {
    if (seated.has(id)) return { tone: "taken", note: t("tonight.taken") }
    const b = coming.get(id)
    if (b) return stateOf(b)
    // kept for walk-ins: free for the desk to seat, not bookable online
    if (keptIds.has(id)) return { tone: "kept", note: t("tonight.keptShort") }
    return { tone: "free" }
  }

  const shown: PublicArea[] = plans
    .map((p) => p.data!)
    .map(({ area, tables, items }) => ({
      id: area.id,
      name: area.name,
      floor: area.floor ?? 0,
      plan_width: area.plan_width,
      plan_height: area.plan_height,
      tables: tables.filter((x) => x.active),
      items,
    }))
    .sort((a, b) => a.floor - b.floor)
  const all = shown.flatMap((a) => a.tables)
  const free = new Set(
    all
      .filter((x) => ["free", "kept"].includes(look(x.id).tone))
      .map((x) => x.id),
  )
  // which states are on the plan (the legend names only those) and how many tables each has
  const tones = all.map((x) => look(x.id).tone)
  const used = new Set(tones)
  const count = (tone: StaffTable["tone"]) =>
    tones.filter((x) => x === tone).length
  const floors = [...new Set(shown.map((a) => a.floor))]
  const floor =
    floorPick !== null && floors.includes(floorPick) ? floorPick : floors[0]

  const tap = (id: number) => {
    const table = all.find((x) => x.id === id)
    if (!table) return
    const sitting = seated.get(id)
    if (sitting) setFreeing({ table, booking: sitting })
    else if (coming.has(id)) setOpen(coming.get(id)!.id)
    else setSeat(table)
  }

  return (
    <Panel
      title={isToday ? t("tonight.title") : t("tonight.titleOn", { date: day })}
      actions={<DayPicker day={day} today={today} onChange={setDayPick} />}
    >
      {shown.length === 0 ? (
        <p className="text-muted-foreground">{t("tonight.empty")}</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <CountCard
              label={t("tonight.free")}
              value={free.size}
              tone="border-[var(--brand)]/60"
            />
            <CountCard
              label={isToday ? t("tonight.taken") : t("tonight.booked")}
              value={
                isToday
                  ? all.filter((x) => seated.has(x.id)).length
                  : all.filter((x) => coming.has(x.id)).length
              }
              tone="border-rose-600/70"
            />
            <CountCard
              label={t("tonight.cardTotal")}
              value={all.length}
              tone="border-border"
            />
          </div>
          {(used.has("confirmed") ||
            used.has("unpaid") ||
            used.has("slip") ||
            used.has("review")) && (
            <p className="flex flex-wrap gap-2 text-sm">
              {used.has("confirmed") && (
                <StateChip className="bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100">
                  {t("tonight.nConfirmed", { count: count("confirmed") })}
                </StateChip>
              )}
              {used.has("unpaid") && (
                <StateChip className="bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100">
                  {t("tonight.nUnpaid", { count: count("unpaid") })}
                </StateChip>
              )}
              {used.has("slip") && (
                <StateChip className="bg-violet-100 text-violet-900 dark:bg-violet-400/20 dark:text-violet-100">
                  {t("tonight.nSlip", { count: count("slip") })}
                </StateChip>
              )}
              {used.has("review") && (
                <StateChip className="bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-100">
                  {t("tonight.nReview", { count: count("review") })}
                </StateChip>
              )}
            </p>
          )}
          <Plans
            areas={shown}
            floors={floors}
            floor={floor}
            free={free}
            chosen={new Set()}
            onFloor={setFloorPick}
            onToggle={tap}
            staffLook={look}
          />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <Swatch className="border-2 border-[var(--brand)]/60 bg-card">
              {t("tonight.free")}
            </Swatch>
            <Swatch className="border-2 border-rose-600 bg-rose-500">
              {t("tonight.taken")}
            </Swatch>
            <Swatch className="border-2 border-dashed border-amber-500 bg-amber-50 dark:bg-amber-400/15">
              {t("tonight.booked")}
            </Swatch>
            <Swatch className="border-2 border-sky-500 bg-sky-50 dark:bg-sky-400/15">
              {t("tonight.kept")}
            </Swatch>
            {used.has("confirmed") && (
              <Swatch className="border-2 border-emerald-600 bg-emerald-500">
                {t("tonight.confirmed")}
              </Swatch>
            )}
            {used.has("unpaid") && (
              <Swatch className="border-2 border-dashed border-amber-500 bg-amber-100">
                {t("tonight.unpaid")}
              </Swatch>
            )}
            {used.has("slip") && (
              <Swatch className="border-2 border-violet-500 bg-violet-100">
                {t("tonight.slip")}
              </Swatch>
            )}
            {used.has("review") && (
              <Swatch className="border-2 border-orange-600 bg-orange-100">
                {t("tonight.review")}
              </Swatch>
            )}
            <span>{t("tonight.tapHint")}</span>
          </p>
        </div>
      )}
      {seat && (
        <SeatDialog
          table={seat}
          canSeat={isToday}
          kept={keptIds.has(seat.id)}
          onClose={() => setSeat(null)}
        />
      )}
      {freeing && (
        <FreeDialog
          table={freeing.table}
          booking={freeing.booking}
          onClose={() => setFreeing(null)}
          onDetails={() => {
            setOpen(freeing.booking.id)
            setFreeing(null)
          }}
        />
      )}
      <BookingSheet id={open} onClose={() => setOpen(null)} />
    </Panel>
  )
}

/** One of the three counts above the plan: free, taken, all tables */
function CountCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <div className={cn("rounded-xl border-2 bg-card px-3 py-2.5", tone)}>
      <p className="text-2xl leading-none font-semibold tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function Swatch({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block size-3.5 rounded", className)} />
      {children}
    </span>
  )
}

/** Keep a table for walk-ins, or give it back to online booking (it stays so until switched: no day or time) */
function useKeepForWalkIns() {
  const { base, key } = useBiz()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const set = async (table: PublicTable, keep: boolean, done: () => void) => {
    setPending(true)
    setError(null)
    try {
      await manage.saveResource(base, {
        ...(table as ManagedTable),
        kind: "table",
        walk_in_only: keep,
      })
      void queryClient.invalidateQueries({ queryKey: key("plan") })
      void queryClient.invalidateQueries({ queryKey: ["public"] })
      toast.success(
        t(keep ? "tonight.keptOn" : "tonight.keptOff", { name: table.name }),
      )
      done()
    } catch (e) {
      setError(e)
    } finally {
      setPending(false)
    }
  }
  return { set, pending, error }
}

/** A free table: mark it taken in one tap (today only), and keep it for walk-ins or not */
function SeatDialog({
  table,
  canSeat,
  kept,
  onClose,
}: {
  table: PublicTable
  /** today only: nobody sits down on a later day */
  canSeat: boolean
  kept: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const walkIn = useWalkIn()
  const keep = useKeepForWalkIns()
  const [guests, setGuests] = useState(Math.max(1, table.seats))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{table.name}</DialogTitle>
          <DialogDescription>
            {canSeat
              ? t("tonight.seatLead", { count: table.seats })
              : t("tonight.laterLead", { count: table.seats })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start justify-between gap-4 rounded-lg border px-3 py-3">
          <div>
            <label htmlFor="keep-walkin" className="text-sm font-medium">
              {t("tonight.keepLabel")}
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("tonight.keepHint")}
            </p>
          </div>
          <Switch
            id="keep-walkin"
            checked={kept}
            disabled={keep.pending}
            onCheckedChange={(on) => void keep.set(table, on, onClose)}
          />
        </div>
        <ErrorAlert error={keep.error} />
        {canSeat && (
          <div className="flex items-center justify-between">
            <span className="text-sm">{t("public.tables.people")}</span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 rounded-full"
                aria-label={t("public.fewerSeats")}
                disabled={guests <= 1}
                onClick={() => setGuests(guests - 1)}
              >
                <MinusIcon />
              </Button>
              <span className="w-8 text-center text-xl font-semibold tabular-nums">
                {guests}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 rounded-full"
                aria-label={t("public.moreSeats")}
                disabled={guests >= 99}
                onClick={() => setGuests(guests + 1)}
              >
                <PlusIcon />
              </Button>
            </div>
          </div>
        )}
        {canSeat && <ErrorAlert error={walkIn.error} />}
        {canSeat && (
          <Button
            className="h-12 w-full bg-rose-600 text-base text-white hover:bg-rose-700"
            disabled={walkIn.isPending}
            onClick={() =>
              walkIn.mutate(
                { table_ids: [table.id], guests },
                {
                  onSuccess: () => {
                    toast.success(
                      t("tonight.markedTaken", { name: table.name }),
                    )
                    onClose()
                  },
                },
              )
            }
          >
            {walkIn.isPending && <Spinner />}
            {t("tonight.markTaken")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** A taken table: free it (the bill is closed), or open the booking */
function FreeDialog({
  table,
  booking: b,
  onClose,
  onDetails,
}: {
  table: PublicTable
  booking: Booking
  onClose: () => void
  onDetails: () => void
}) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const status = useChangeStatus()
  const who = b.customer_name ?? b.guest_name
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{table.name}</DialogTitle>
          <DialogDescription>
            {t("tonight.takenSince", {
              time: timeIn(b.arrived_at ?? b.starts_at, tz),
              count: b.guests ?? 0,
            })}
            {who && who !== "Walk-in" && ` · ${who}`}
          </DialogDescription>
        </DialogHeader>
        <ErrorAlert error={status.error} />
        <div className="grid gap-2">
          <Button
            className="h-12 w-full text-base"
            disabled={status.isPending}
            onClick={() =>
              status.mutate(
                { id: b.id, status: "completed" },
                {
                  onSuccess: () => {
                    toast.success(t("tonight.freed", { name: table.name }))
                    onClose()
                  },
                },
              )
            }
          >
            {status.isPending && <Spinner />}
            {t("tonight.freeTable")}
          </Button>
          <Button variant="outline" className="h-11" onClick={onDetails}>
            {t("tonight.details")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Back and forward by a day, or a date: today by default; later days show what is booked */
function DayPicker({
  day,
  today,
  onChange,
}: {
  day: string
  today: string
  onChange: (day: string) => void
}) {
  const { t } = useTranslation()
  const shift = (n: number) => {
    const d = new Date(`${day}T12:00:00`)
    d.setDate(d.getDate() + n)
    const next = d.toLocaleDateString("en-CA")
    onChange(next < today ? today : next)
  }
  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 lg:size-9"
        aria-label={t("tonight.prevDay")}
        disabled={day <= today}
        onClick={() => shift(-1)}
      >
        <ChevronLeftIcon />
      </Button>
      <Input
        type="date"
        aria-label={t("tonight.pickDay")}
        value={day}
        min={today}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-11 w-40 lg:h-9"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 lg:size-9"
        aria-label={t("tonight.nextDay")}
        onClick={() => shift(1)}
      >
        <ChevronRightIcon />
      </Button>
      {day !== today && (
        <Button
          type="button"
          variant="ghost"
          className="h-11 lg:h-9"
          onClick={() => onChange(today)}
        >
          {t("tonight.today")}
        </Button>
      )}
    </div>
  )
}

function StateChip({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  return (
    <span className={cn("rounded-full px-3 py-1 font-medium", className)}>
      {children}
    </span>
  )
}
