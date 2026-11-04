import { MinusIcon, PlusIcon } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { currentItems } from "@/features/public/booking-utils"
import { Plans } from "@/features/public/TableBookingPanel"
import type { StaffTable } from "@/features/public/TablePlan"
import type { Booking, PublicArea, PublicTable } from "@/lib/api/types"
import { timeIn, todayIn } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useAllFloorPlans, useSettings, useSportsList } from "./api"
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
  const areas = useSportsList()
  const live = (areas.data ?? []).filter((a) => a.active)
  const plans = useAllFloorPlans(live.map((a) => a.id))
  const bookings = useBookingList({ from: today, to: today, limit: 100 })
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
    if (Date.parse(b.ends_at) <= now) continue
    for (const i of currentItems(b)) {
      const id = i.resource_id ?? 0
      if (b.arrived_at) seated.set(id, b)
      else if (
        !coming.has(id) ||
        b.starts_at < (coming.get(id)?.starts_at ?? "")
      )
        coming.set(id, b)
    }
  }
  const look = (id: number): StaffTable => {
    if (seated.has(id)) return { tone: "taken", note: t("tonight.taken") }
    const b = coming.get(id)
    if (b)
      return { tone: "booked", note: timeIn(b.arrive_by ?? b.starts_at, tz) }
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
    all.filter((x) => look(x.id).tone === "free").map((x) => x.id),
  )
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
      title={t("tonight.title")}
      lead={t("tonight.leadNow", {
        free: free.size,
        taken: all.filter((x) => seated.has(x.id)).length,
        total: all.length,
      })}
    >
      {shown.length === 0 ? (
        <p className="text-muted-foreground">{t("tonight.empty")}</p>
      ) : (
        <div className="space-y-3">
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
            <span>{t("tonight.tapHint")}</span>
          </p>
        </div>
      )}
      {seat && <SeatDialog table={seat} onClose={() => setSeat(null)} />}
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

/** A free table: mark it taken in one tap (how many people is filled in with its seats) */
function SeatDialog({
  table,
  onClose,
}: {
  table: PublicTable
  onClose: () => void
}) {
  const { t } = useTranslation()
  const walkIn = useWalkIn()
  const [guests, setGuests] = useState(Math.max(1, table.seats))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{table.name}</DialogTitle>
          <DialogDescription>
            {t("tonight.seatLead", { count: table.seats })}
          </DialogDescription>
        </DialogHeader>
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
        <ErrorAlert error={walkIn.error} />
        <Button
          className="h-12 w-full bg-rose-600 text-base text-white hover:bg-rose-700"
          disabled={walkIn.isPending}
          onClick={() =>
            walkIn.mutate(
              { table_ids: [table.id], guests },
              {
                onSuccess: () => {
                  toast.success(t("tonight.markedTaken", { name: table.name }))
                  onClose()
                },
              },
            )
          }
        >
          {walkIn.isPending && <Spinner />}
          {t("tonight.markTaken")}
        </Button>
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
