import { MinusIcon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { Booking, CalendarLane } from "@/lib/api/types"
import { dayIn, timeIn, todayIn } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useSettings } from "../api"
import { FormDialog } from "../ui"
import { useCalendar, useMoveTables, useWalkIn } from "./api"
import { groupLanes } from "./lanes"

const ACTIVE = ["pending", "confirmed"]

/** What a table is doing right now (other than the booking being moved) and its next booking today */
function tableState(
  lane: CalendarLane,
  now: string,
  exclude?: number,
  /** a booking of another time (moving a booking that has not started): taken = something else holds the table then */
  window?: { start: string; end: string },
) {
  let busy = false
  let next: string | undefined
  for (const e of lane.entries) {
    if (
      e.kind === "booking" &&
      (e.booking_id === exclude || !ACTIVE.includes(e.status ?? ""))
    )
      continue
    if (e.kind === "class") continue
    if (window) {
      if (e.starts_at < window.end && e.ends_at > window.start) busy = true
      continue
    }
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
 * Today's tables by area: seats, free / booked later / taken now, and the next booking. Taken tables cannot be
 * picked; several tables can be joined for a big group. The counts and the search stay in view; the list scrolls.
 * Typing a name (11, A1) highlights that table and scrolls to it; Enter picks it.
 */
function TablePicker({
  value,
  onChange,
  guests,
  exclude,
  listClass = "max-h-[34dvh]",
  date,
  window,
}: {
  value: number[]
  onChange: (ids: number[]) => void
  guests: number
  /** the booking being moved: its own tables count as free */
  exclude?: number
  /** how tall the scrolling list may be */
  listClass?: string
  /** the day whose tables are shown (YYYY-MM-DD): today when not given */
  date?: string
  /** the time of the booking being moved, when it is not now: the tables free then */
  window?: { start: string; end: string }
}) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const calendar = useCalendar(date ?? todayIn(tz), 1)
  const [now] = useState(() => new Date().toISOString())
  const [query, setQuery] = useState("")
  const nodes = useRef(new Map<number, HTMLButtonElement>())
  const tables = (calendar.data?.lanes ?? []).filter(
    (l) => l.owner_type === "resource" && l.seats > 0,
  )
  const state = new Map(
    tables.map((l) => [l.owner_id, tableState(l, now, exclude, window)]),
  )

  // the tables the typed name points at: the exact name, else names that start with it, else names that hold it
  const q = query.trim().toLowerCase()
  const lower = (l: CalendarLane) => l.name.toLowerCase()
  const found = !q
    ? []
    : ([
        tables.filter((l) => lower(l) === q),
        tables.filter((l) => lower(l).startsWith(q)),
        tables.filter((l) => lower(l).includes(q)),
      ].find((tier) => tier.length > 0) ?? [])
  const foundIds = new Set(found.map((l) => l.owner_id))
  const firstFound = found[0]?.owner_id
  useEffect(() => {
    if (firstFound)
      nodes.current
        .get(firstFound)
        ?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [firstFound])

  if (!calendar.data) return <Skeleton className="h-48 rounded-xl" />
  const groups = groupLanes(tables, true, t)
  const seats = tables
    .filter((l) => value.includes(l.owner_id))
    .reduce((n, l) => n + l.seats, 0)
  const toggle = (id: number) =>
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    )
  const taken = tables.filter((l) => state.get(l.owner_id)?.busy).length
  const booked = tables.filter((l) => {
    const s = state.get(l.owner_id)
    return !s?.busy && s?.next
  }).length
  const free = tables.length - taken - booked

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border bg-background" />
          {t("desk.countFree", { count: free })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-amber-500 bg-amber-100" />
          {t("desk.countBooked", { count: booked })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-dashed border-rose-400 bg-rose-100" />
          {t("desk.countTaken", { count: taken })}
        </span>
      </div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          placeholder={t("desk.findTable")}
          aria-label={t("desk.findTable")}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter finds and picks (it must not send the form)
            if (e.key !== "Enter") return
            e.preventDefault()
            const hit = found[0]
            if (hit && !state.get(hit.owner_id)?.busy) toggle(hit.owner_id)
          }}
          className="h-11 pl-9 lg:h-9"
        />
        {q && found.length === 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("desk.noTableNamed", { name: query.trim() })}
          </p>
        )}
      </div>
      <div
        className={cn(
          "space-y-4 overflow-y-auto rounded-lg border p-2",
          listClass,
        )}
      >
        {groups.map((g) => (
          <section key={g.key} className="space-y-2">
            <h3 className="text-sm font-semibold">{g.label}</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {g.lanes.map((l) => {
                const { busy, next } = state.get(l.owner_id) ?? {
                  busy: false,
                  next: undefined,
                }
                const on = value.includes(l.owner_id)
                const hit = foundIds.has(l.owner_id)
                return (
                  <button
                    key={l.owner_id}
                    ref={(el) => {
                      if (el) nodes.current.set(l.owner_id, el)
                      else nodes.current.delete(l.owner_id)
                    }}
                    type="button"
                    aria-pressed={on}
                    disabled={busy && !on}
                    onClick={() => toggle(l.owner_id)}
                    className={cn(
                      "flex min-h-16 flex-col items-start justify-center rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : busy
                          ? "border-dashed border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                          : next
                            ? "border-amber-500 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-100"
                            : "bg-background hover:bg-muted",
                      // the table the search found
                      hit &&
                        "ring-3 ring-sky-500 ring-offset-2 ring-offset-background",
                    )}
                  >
                    <span className="font-semibold">{l.name}</span>
                    <span className="flex items-center gap-1 text-xs opacity-80">
                      <UsersIcon className="size-3" />
                      {l.seats}
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        next && !busy && !on ? "font-semibold" : "opacity-80",
                      )}
                    >
                      {busy
                        ? window
                          ? t("desk.tableBookedThen")
                          : t("desk.tableTaken")
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
      </div>
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
      {/* the counts and the search stay in view, the tables scroll in their own box */}
      <TablePicker
        value={tables}
        onChange={setTables}
        guests={guests}
        listClass="max-h-[16dvh] sm:max-h-[26dvh]"
      />
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
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const move = useMoveTables()
  // a booking that has not started is moved at ITS time: the tables shown are the ones of its day and free then
  // (a started booking moves from now on: today's tables, taken or free now)
  const later = Date.parse(b.starts_at) > Date.now()
  // nothing is preselected: the old tables are freed by the move, so tapping a new table moves the group there
  // (a preselected old table made "31 + 22" instead of "22")
  const [tables, setTables] = useState<number[]>([])
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("desk.moveTable")}
      description={`${t("desk.moveFor", { when: `${dayIn(b.starts_at, tz)} ${timeIn(b.starts_at, tz)}` })} ${t("desk.moveLead", { count: b.guests ?? 0 })}`}
      submitLabel={t("desk.moveHere")}
      pending={move.isPending}
      error={move.error}
      onSubmit={(e) => {
        e.preventDefault()
        if (tables.length === 0) return
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
        date={later ? todayIn(tz, new Date(b.starts_at)) : undefined}
        window={later ? { start: b.starts_at, end: b.ends_at } : undefined}
      />
    </FormDialog>
  )
}
