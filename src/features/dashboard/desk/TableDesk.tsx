import { MinusIcon, PlusIcon, UsersIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { Booking, CalendarLane } from "@/lib/api/types"
import { timeIn, todayIn } from "@/lib/format"
import { cn } from "@/lib/utils"
import { currentItems } from "@/features/public/booking-utils"

import { useSettings } from "../api"
import { FormDialog } from "../ui"
import { useCalendar, useMoveTables, useWalkIn } from "./api"
import { groupLanes } from "./lanes"

const ACTIVE = ["pending", "confirmed"]

/** What a table is doing right now (other than the booking being moved) and its next booking today */
function tableState(lane: CalendarLane, now: string, exclude?: number) {
  let busy = false
  let next: string | undefined
  for (const e of lane.entries) {
    if (
      e.kind === "booking" &&
      (e.booking_id === exclude || !ACTIVE.includes(e.status ?? ""))
    )
      continue
    if (e.kind === "class") continue
    if (e.starts_at <= now && e.ends_at > now) busy = true
    else if (
      e.kind === "booking" &&
      e.starts_at > now &&
      (!next || e.starts_at < next)
    )
      next = e.starts_at
  }
  return { busy, next }
}

/**
 * Today's tables by area: seats, free / taken now, and the next booking. Taken tables cannot be
 * picked; several tables can be joined for a big group.
 */
function TablePicker({
  value,
  onChange,
  guests,
  exclude,
}: {
  value: number[]
  onChange: (ids: number[]) => void
  guests: number
  /** the booking being moved: its own tables count as free */
  exclude?: number
}) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const calendar = useCalendar(todayIn(tz), 1)
  const [now] = useState(() => new Date().toISOString())
  if (!calendar.data) return <Skeleton className="h-48 rounded-xl" />
  const tables = calendar.data.lanes.filter(
    (l) => l.owner_type === "resource" && l.seats > 0,
  )
  const groups = groupLanes(tables, true, t)
  const seats = tables
    .filter((l) => value.includes(l.owner_id))
    .reduce((n, l) => n + l.seats, 0)
  const toggle = (id: number) =>
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    )

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <h3 className="text-sm font-semibold">{g.label}</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {g.lanes.map((l) => {
              const { busy, next } = tableState(l, now, exclude)
              const on = value.includes(l.owner_id)
              return (
                <button
                  key={l.owner_id}
                  type="button"
                  aria-pressed={on}
                  disabled={busy && !on}
                  onClick={() => toggle(l.owner_id)}
                  className={cn(
                    "flex min-h-16 flex-col items-start justify-center rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : busy
                        ? "border-dashed bg-muted text-muted-foreground"
                        : "bg-background hover:bg-muted",
                  )}
                >
                  <span className="font-semibold">{l.name}</span>
                  <span className="flex items-center gap-1 text-xs opacity-80">
                    <UsersIcon className="size-3" />
                    {l.seats}
                  </span>
                  <span className="text-xs opacity-80">
                    {busy
                      ? t("desk.tableTaken")
                      : next
                        ? t("desk.tableNext", { time: timeIn(next, tz) })
                        : t("desk.tableFree")}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <p
        className={cn(
          "text-sm font-medium",
          value.length > 0 && seats < guests && "text-destructive",
        )}
      >
        {value.length === 0
          ? t("desk.pickTables")
          : t("desk.seatsForGuests", { seats, count: guests })}
      </p>
    </div>
  )
}

function GuestsStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 rounded-full lg:size-9"
        aria-label={t("public.fewerSeats")}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon />
      </Button>
      <span className="w-8 text-center text-xl font-semibold tabular-nums">
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 rounded-full lg:size-9"
        aria-label={t("public.moreSeats")}
        disabled={value >= 99}
        onClick={() => onChange(value + 1)}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

/** A group without booking: how many, which free tables, name and phone if they give them */
export function WalkInDialog({
  tableId,
  onClose,
  onDone,
}: {
  /** the table tapped on the calendar */
  tableId?: number
  onClose: () => void
  onDone: (b: Booking) => void
}) {
  const { t } = useTranslation()
  const walkIn = useWalkIn()
  const [guests, setGuests] = useState(2)
  const [tables, setTables] = useState<number[]>(tableId ? [tableId] : [])
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("desk.walkInTitle")}
      description={t("desk.walkInLead")}
      submitLabel={t("desk.seatNow")}
      pending={walkIn.isPending}
      error={walkIn.error}
      onSubmit={(e) => {
        e.preventDefault()
        walkIn.mutate(
          {
            table_ids: tables,
            guests,
            name: name.trim() || undefined,
            phone: phone.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          {
            onSuccess: (b) => {
              toast.success(t("desk.walkInDone"))
              onDone(b)
            },
          },
        )
      }}
    >
      <div className="space-y-2">
        <Label>{t("public.tables.people")}</Label>
        <GuestsStepper value={guests} onChange={setGuests} />
      </div>
      <TablePicker value={tables} onChange={setTables} guests={guests} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="walkin-name">{t("desk.nameOptional")}</Label>
          <Input
            id="walkin-name"
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            className="h-11 lg:h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="walkin-phone">{t("desk.phoneOptional")}</Label>
          <Input
            id="walkin-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 lg:h-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="walkin-notes">{t("desk.notes")}</Label>
        <Textarea
          id="walkin-notes"
          rows={2}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </FormDialog>
  )
}

/** Put a group at other tables: from now on, or from its time if it has not started */
export function MoveTablesDialog({
  booking: b,
  onClose,
}: {
  booking: Booking
  onClose: () => void
}) {
  const { t } = useTranslation()
  const move = useMoveTables()
  const current = currentItems(b)
    .filter((i) => i.resource_id)
    .map((i) => i.resource_id!)
  const [tables, setTables] = useState<number[]>(current)
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("desk.moveTable")}
      description={t("desk.moveLead", { count: b.guests ?? 0 })}
      submitLabel={t("desk.moveHere")}
      pending={move.isPending}
      error={move.error}
      onSubmit={(e) => {
        e.preventDefault()
        move.mutate(
          { id: b.id, table_ids: tables },
          {
            onSuccess: () => {
              toast.success(t("desk.moved"))
              onClose()
            },
          },
        )
      }}
    >
      <TablePicker
        value={tables}
        onChange={setTables}
        guests={b.guests ?? 0}
        exclude={b.id}
      />
    </FormDialog>
  )
}
