import { CalendarDaysIcon, UsersIcon, XIcon } from "lucide-react"
import {
  lazy,
  Suspense,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { ClassSession, PublicCoach, PublicResource } from "@/lib/api/types"
import {
  dayIn,
  duration,
  longDayIn,
  middayOf,
  money,
  nextDays,
  timeIn,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import { releaseBooking, useUnsaved } from "@/stores/unsaved"

import {
  useAvailability,
  useClassesOn,
  useCoaches,
  useResources,
  useSports,
  useUpcomingClasses,
} from "./api"
import { BookingBar } from "./BookingBar"
import { brandStyle } from "./brand"
import { kindOf } from "./booking-utils"
import { usePublic } from "./context"
import { dayColorOf } from "./day-colors"
import { PinnedBar, useScrolledPast } from "./PinnedBar"
import {
  selectionQuery,
  useSelection,
  type BookWhat,
  type Selection,
} from "./selection"
import { lengthsOf } from "@/components/booking/lengths"
import { TimePicker } from "@/components/booking/TimePicker"

// the month calendar is only needed after "More dates": load it then
const Calendar = lazy(async () => ({
  default: (await import("@/components/ui/calendar")).Calendar,
}))

const DEFAULT_DAYS = 14
const MAX_DAYS = 60

/**
 * Pick a sport, then a court / coach / class, a day, a free start and a length. Every choice is
 * kept in the URL; the bar at the bottom shows the price and goes to checkout.
 */
export function BookingPanel() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const tz = business.timezone
  const [sel, setSel] = useSelection()

  const sports = useSports(slug)
  const resources = useResources(slug)
  const coaches = useCoaches(slug)
  const upcoming = useUpcomingClasses(slug)

  // --- resolve the choice from the URL, falling back to the first option at each step ---
  const sportList = sports.data ?? []
  const sport = sportList.find((s) => s.id === sel.sport) ?? sportList[0]
  const courts = (resources.data ?? []).filter((r) => r.sport_id === sport?.id)
  // customers see what the spaces are ("Choose a ring"); a mix of kinds is just "a space"
  const spaceKind = kindOf(courts)
  const sportCoaches = (coaches.data ?? []).filter((c) =>
    c.sports.some((s) => s.id === sport?.id),
  )
  const hasClasses = (upcoming.data ?? []).some((c) => c.sport_id === sport?.id)
  const options = (
    [
      courts.length > 0 && "court",
      sportCoaches.length > 0 && "coach",
      hasClasses && "class",
    ] as Array<BookWhat | false>
  ).filter((o): o is BookWhat => !!o)
  const what = sel.what && options.includes(sel.what) ? sel.what : options[0]

  const court =
    what === "court"
      ? (courts.find((c) => c.id === sel.court) ?? courts[0])
      : undefined
  const coach =
    what === "coach"
      ? (sportCoaches.find((c) => c.id === sel.coach) ?? sportCoaches[0])
      : what === "court"
        ? sportCoaches.find((c) => c.id === sel.coach) // optional extra
        : undefined

  const [daysAhead, setDaysAhead] = useState(DEFAULT_DAYS)
  const days = useMemo(() => nextDays(tz, daysAhead), [tz, daysAhead])
  const date = sel.date && days.includes(sel.date) ? sel.date : days[0]

  const query =
    what && what !== "class" && sport
      ? {
          date,
          resource_id: court?.id,
          coach_id: coach?.id,
          sport_id: sport.id,
        }
      : null
  const availability = useAvailability(slug, query)
  // spaces and coaches: once the rules are known, offer exactly the days that can be booked
  // (today + max_days_ahead). Classes are not limited by that rule (any scheduled class can be
  // booked), so their calendar reaches as far as the page goes.
  const rule = availability.data?.rule
  const allowedDays =
    what === "class"
      ? MAX_DAYS
      : rule
        ? Math.min(Math.max(rule.max_days_ahead + 1, 1), MAX_DAYS)
        : daysAhead
  if (allowedDays !== daysAhead) setDaysAhead(allowedDays)

  // length first (the shortest by default), then a start that allows it
  const lengths = availability.data ? lengthsOf(availability.data) : []
  const length =
    sel.length && lengths.includes(sel.length) ? sel.length : lengths[0]
  const slot = availability.data?.slots.find(
    (s) => s.starts_at === sel.start && s.durations_min.includes(length),
  )
  const price = availability.data?.prices.find(
    (p) => p.duration_min === length,
  )?.price

  // a change at one step clears the steps after it
  const choose = (patch: Selection) => setSel({ ...sel, ...patch })

  if (sports.isPending || resources.isPending || coaches.isPending) {
    return <PanelSkeleton />
  }
  if (sportList.length === 0 || !sport || !what) {
    return (
      <p className="rounded-xl bg-white p-6 text-muted-foreground">
        {t("public.nothingToBook")}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {sportList.length > 1 && (
        <Step title={t("public.step.sport")}>
          <Chips
            label={t("public.step.sport")}
            items={sportList.map((s) => ({ id: s.id, label: s.name }))}
            value={sport.id}
            onChange={(id) => setSel({ sport: id, date: sel.date })}
          />
        </Step>
      )}

      {options.length > 1 && (
        <Step title={t("public.step.what")}>
          <Chips
            label={t("public.step.what")}
            items={options.map((o) => ({
              id: o,
              label:
                o === "court"
                  ? t(`public.spaceKind.${spaceKind}`)
                  : t(`public.what.${o}`),
            }))}
            value={what}
            onChange={(o) =>
              setSel({ sport: sport.id, what: o, date: sel.date })
            }
          />
        </Step>
      )}

      {what === "court" && (
        <Step title={t(`public.choose.${spaceKind}`)}>
          <TargetList
            items={courts}
            value={court?.id}
            onChange={(id) => choose({ court: id, start: undefined })}
          />
          {sportCoaches.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-sm text-muted-foreground">
                {t("public.addCoach")}
              </p>
              <Chips
                label={t("public.addCoach")}
                items={[
                  { id: 0, label: t("public.noCoach") },
                  ...sportCoaches.map((c) => ({ id: c.id, label: c.name })),
                ]}
                value={coach?.id ?? 0}
                onChange={(id) =>
                  choose({ coach: id || undefined, start: undefined })
                }
              />
            </div>
          )}
        </Step>
      )}

      {what === "coach" && (
        <Step title={t("public.step.coach")}>
          <TargetList
            items={sportCoaches}
            value={coach?.id}
            onChange={(id) => choose({ coach: id, start: undefined })}
          />
        </Step>
      )}

      <Step title={t("public.step.day")}>
        <DateStrip
          days={days}
          value={date}
          tz={tz}
          onChange={(d) =>
            choose({ date: d, start: undefined, cls: undefined })
          }
        />
      </Step>

      {what === "class" ? (
        <ClassList
          date={date}
          sportId={sport.id}
          value={sel.cls}
          seats={sel.seats ?? 1}
          onChange={(cls, seats) => choose({ cls, seats })}
          onClear={() => choose({ cls: undefined, seats: undefined })}
          onNextDay={() => {
            const next = days[days.indexOf(date) + 1]
            if (next) choose({ date: next, cls: undefined })
          }}
        />
      ) : (
        <section>
          {availability.isError ? (
            <ErrorAlert error={availability.error} />
          ) : !availability.data ? (
            <SlotSkeleton />
          ) : availability.data.slots.length === 0 ? (
            <EmptyDay
              onNextDay={() => {
                const next = days[days.indexOf(date) + 1]
                if (next) choose({ date: next, start: undefined })
              }}
            />
          ) : (
            <div className={cn(availability.isPlaceholderData && "opacity-60")}>
              <TimePicker
                availability={availability.data}
                tz={tz}
                start={sel.start}
                length={sel.length}
                // the previous day's times stay visible while the new ones load: not tappable
                disabled={availability.isPlaceholderData}
                onChange={(start, length) => choose({ start, length })}
              />
            </div>
          )}
        </section>
      )}

      {what !== "class" && slot && length && (
        <ChosenSlot
          title={t(
            what === "coach" ? "public.yourLesson" : "public.yourBooking",
          )}
          startsAt={slot.starts_at}
          minutes={length}
          name={[
            court?.name,
            what === "court" && coach ? coach.name : undefined,
            what === "coach" ? coach?.name : undefined,
          ]
            .filter(Boolean)
            .join(" + ")}
          price={price}
          currency={availability.data?.currency ?? business.currency}
          onClear={() => choose({ start: undefined, length: undefined })}
          checkout={{
            sport: sport.id,
            what,
            court: court?.id,
            coach: coach?.id,
            date,
            start: slot.starts_at,
            length,
          }}
        />
      )}
      {what !== "class" && slot && length && (
        <BookingBar
          summary={[
            court?.name,
            what === "court" && coach ? coach.name : undefined,
            what === "coach" ? coach?.name : undefined,
          ]
            .filter(Boolean)
            .join(" + ")}
          when={`${dayIn(slot.starts_at, tz)} · ${timeIn(slot.starts_at, tz)} · ${duration(length)}`}
          price={price}
          currency={availability.data?.currency ?? business.currency}
          checkout={{
            sport: sport.id,
            what,
            court: court?.id,
            coach: coach?.id,
            date,
            start: slot.starts_at,
            length,
          }}
        />
      )}
      {what === "class" && sel.cls && (
        <ClassBar
          sportId={sport.id}
          date={date}
          cls={sel.cls}
          seats={sel.seats ?? 1}
        />
      )}
    </div>
  )
}

function ClassBar({
  sportId,
  date,
  cls,
  seats,
}: {
  sportId: number
  date: string
  cls: number
  seats: number
}) {
  const { slug, business } = usePublic()
  const tz = business.timezone
  const classes = useClassesOn(slug, date)
  const c = classes.data?.find((x) => x.id === cls)
  if (!c) return null
  return (
    <BookingBar
      summary={c.title}
      when={`${dayIn(c.starts_at, tz)} · ${timeIn(c.starts_at, tz)}–${timeIn(c.ends_at, tz)}`}
      price={c.price * seats}
      currency={c.currency}
      checkout={{ sport: sportId, what: "class", date, cls, seats }}
    />
  )
}

function Step({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}

/** One-of-many choice as big tappable chips; scrolls sideways on phones */
function Chips<T extends string | number>({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: Array<{ id: T; label: string }>
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="-mx-4 no-scrollbar flex scroll-px-4 gap-2 overflow-x-auto px-4 pb-1"
    >
      {items.map((item) => {
        const selected = item.id === value
        return (
          <button
            key={String(item.id)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              "h-11 shrink-0 rounded-full border px-5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
              selected
                ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
                : "border-black/10 bg-white text-foreground active:bg-[var(--brand-soft)]",
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

/** Courts or coaches with their hourly price */
function TargetList({
  items,
  value,
  onChange,
}: {
  items: Array<PublicResource | PublicCoach>
  value?: number
  onChange: (id: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const selected = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex min-h-16 items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
              selected
                ? "border-[var(--brand)] ring-2 ring-[var(--brand)]"
                : "border-black/10 active:bg-[var(--brand-soft)]",
            )}
          >
            <span className="display-tight text-xl">{item.name}</span>
            {item.price_per_hour !== null && item.currency && (
              <span className="shrink-0 text-sm text-muted-foreground">
                {t("public.perHour", {
                  price: money(item.price_per_hour, item.currency),
                })}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** The next days as a swipeable strip; "More dates" opens a month calendar */
function DateStrip({
  days,
  value,
  tz,
  onChange,
}: {
  days: string[]
  value: string
  tz: string
  onChange: (date: string) => void
}) {
  const { t } = useTranslation()
  const { business } = usePublic()
  const [open, setOpen] = useState(false)
  // the date highlighted in the calendar: only becomes the choice when Confirm is pressed
  const [draft, setDraft] = useState(value)
  const shown = days.slice(0, 14)
  const picked = dayColorOf(middayOf(draft, tz), tz)
  const first = new Date(`${days[0]}T00:00:00`)
  const last = new Date(`${days[days.length - 1]}T00:00:00`)
  const toYmd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

  return (
    <>
      <div
        role="radiogroup"
        aria-label={t("public.step.day")}
        className="-mx-4 no-scrollbar flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1"
      >
        {shown.map((d) => {
          const selected = d === value
          const iso = middayOf(d, tz)
          // the picked day takes the colour of its weekday (Monday yellow, Tuesday pink, …)
          const color = dayColorOf(iso, tz)
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={dayIn(iso, tz)}
              onClick={() => onChange(d)}
              style={
                selected
                  ? {
                      background: color.bg,
                      color: color.fg,
                      borderColor: color.ink,
                      boxShadow: `inset 0 0 0 1px ${color.ink}`,
                    }
                  : undefined
              }
              className={cn(
                "flex h-16 w-14 shrink-0 snap-start flex-col items-center justify-center rounded-xl border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
                !selected &&
                  "border-black/10 bg-white active:bg-[var(--brand-soft)]",
              )}
            >
              <span className="text-xs">{dayIn(iso, tz).split(" ")[0]}</span>
              <span className="display-tight text-2xl tabular-nums">
                {Number(d.slice(8))}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => {
            setDraft(value)
            setOpen(true)
          }}
          className="flex h-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 bg-white px-3 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <CalendarDaysIcon className="size-5" />
          {t("public.moreDates")}
        </button>
      </div>
      {!shown.includes(value) && (
        <p className="text-sm font-medium">{dayIn(middayOf(value, tz), tz)}</p>
      )}
      {/* centred on every screen; the dialog sits outside the page, so it takes the brand colour itself */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={
            {
              ...brandStyle(business.brand_color, business),
              // the picked date takes the colour of its weekday, like the day buttons
              "--primary": picked.bg,
              "--primary-foreground": picked.fg,
              "--day-ink": picked.ink,
            } as CSSProperties
          }
          className="w-auto max-w-[calc(100%-2rem)] gap-2 p-4 sm:max-w-fit [&_[data-selected-single=true]]:shadow-[inset_0_0_0_1px_var(--day-ink)]"
        >
          <DialogHeader>
            <DialogTitle>{t("public.pickDate")}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-80 justify-center">
            <Suspense fallback={<Skeleton className="h-80 w-72 rounded-xl" />}>
              <Calendar
                mode="single"
                selected={new Date(`${draft}T00:00:00`)}
                defaultMonth={new Date(`${value}T00:00:00`)}
                startMonth={first}
                endMonth={last}
                disabled={[{ before: first }, { after: last }]}
                onSelect={(d) => {
                  if (d) setDraft(toYmd(d))
                }}
                className="[--cell-size:2.75rem]"
              />
            </Suspense>
          </div>
          <p className="text-center text-sm font-medium">
            {dayIn(middayOf(draft, tz), tz)}
          </p>
          <Button
            size="lg"
            className="h-12 w-full text-base"
            style={{ background: picked.ink, color: "#ffffff" }}
            onClick={() => {
              onChange(draft)
              setOpen(false)
            }}
          >
            {t("public.confirmDate")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Group classes on the chosen day, with seats left */
function ClassList({
  date,
  sportId,
  value,
  seats,
  onChange,
  onClear,
  onNextDay,
}: {
  date: string
  sportId: number
  value?: number
  seats: number
  onChange: (cls: number, seats: number) => void
  // drop the choice again (before going on to the booking page)
  onClear: () => void
  onNextDay: () => void
}) {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const tz = business.timezone
  const classes = useClassesOn(slug, date)
  const list = (classes.data ?? []).filter((c) => c.sport_id === sportId)
  const chosen = list.find((c) => c.id === value)
  const coaches = useCoaches(slug).data ?? []

  if (classes.isError) return <ErrorAlert error={classes.error} />
  if (!classes.data) return <SlotSkeleton />
  if (list.length === 0) return <EmptyDay classes onNextDay={onNextDay} />

  return (
    <Step title={t("public.step.class")}>
      {/* the day these classes are on, so it is clear which date is being looked at */}
      <p className="-mt-1 text-sm text-muted-foreground">
        {longDayIn(middayOf(date, tz), tz)}
      </p>
      <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
        {list.map((c: ClassSession) => {
          const selected = c.id === value
          const left = c.seats_left ?? c.capacity
          const full = left < 1
          return (
            <div
              key={c.id}
              className={cn(
                "rounded-xl border bg-white",
                selected
                  ? "border-[var(--brand)] ring-2 ring-[var(--brand)]"
                  : "border-black/10",
                full && "opacity-60",
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={full}
                onClick={() => onChange(c.id, 1)}
                className="flex w-full flex-col gap-1 px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="display-tight text-2xl tabular-nums">
                    {timeIn(c.starts_at, tz)}–{timeIn(c.ends_at, tz)}
                  </span>
                  <span className="text-sm font-medium">
                    {money(c.price, c.currency)}
                  </span>
                </span>
                <span className="font-medium">{c.title}</span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <UsersIcon className="size-4" />
                  {full
                    ? t("public.classFull")
                    : t("public.seatsLeft", { count: left })}
                  {c.coach_id &&
                    coaches.find((x) => x.id === c.coach_id) &&
                    ` · ${coaches.find((x) => x.id === c.coach_id)!.name}`}
                </span>
              </button>
              {selected && left > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-2">
                  <span className="text-sm">{t("public.seats")}</span>
                  <SeatStepper
                    value={seats}
                    max={Math.min(left, 10)}
                    onChange={(n) => onChange(c.id, n)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {chosen && (
        <ChosenClass
          c={chosen}
          seats={seats}
          sportId={sportId}
          date={date}
          onClear={onClear}
        />
      )}
    </Step>
  )
}

/** What was picked, with its day and date, and Book right here (the bar at the bottom is easy to miss) */
function ChosenClass({
  c,
  seats,
  sportId,
  date,
  onClear,
}: {
  c: ClassSession
  seats: number
  sportId: number
  date: string
  onClear: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { slug, business } = usePublic()
  const tz = business.timezone
  // the colour of the weekday the class is on (Monday yellow, Tuesday pink, …)
  const day = dayColorOf(c.starts_at, tz)
  const card = useRef<HTMLDivElement>(null)
  const scrolledAway = useScrolledPast(card)
  // a class is picked but not booked yet: leaving the page asks first
  useUnsaved(true, "booking")
  const book = () => {
    releaseBooking()
    navigate(
      `/b/${slug}/book?${selectionQuery({ sport: sportId, what: "class", date, cls: c.id, seats })}`,
    )
  }
  return (
    <>
      {scrolledAway && (
        <PinnedBar
          day={day}
          title={t("public.yourClass")}
          when={`${dayIn(c.starts_at, tz)} · ${timeIn(c.starts_at, tz)}–${timeIn(c.ends_at, tz)}`}
          detail={`${c.title} · ${t("public.seats")}: ${seats} · ${money(c.price * seats, c.currency)}`}
          bookLabel={t("public.book")}
          onBook={book}
          onClear={onClear}
        />
      )}
      <div
        ref={card}
        style={{
          background: day.bg,
          color: day.fg,
          boxShadow: `inset 0 0 0 1px ${day.ink}33`,
        }}
        className="space-y-3 rounded-xl p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold opacity-80">
            {t("public.yourClass")}
          </p>
          {/* not wanted after all: remove it here, before the booking page */}
          <button
            type="button"
            onClick={onClear}
            className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium opacity-90 hover:bg-black/5 hover:opacity-100 focus-visible:ring-3 focus-visible:ring-black/30 focus-visible:outline-none"
          >
            <XIcon className="size-4" />
            {t("public.removeClass")}
          </button>
        </div>
        <div>
          <p className="display-tight text-2xl">{longDayIn(c.starts_at, tz)}</p>
          <p className="display-tight text-xl tabular-nums">
            {timeIn(c.starts_at, tz)}–{timeIn(c.ends_at, tz)}
          </p>
          <p className="mt-1 font-medium">{c.title}</p>
          <p className="text-sm opacity-80">
            {t("public.seats")}: {seats} · {money(c.price * seats, c.currency)}
          </p>
        </div>
        <Button
          size="lg"
          style={{ background: day.ink, color: "#ffffff" }}
          className="h-12 w-full text-base hover:opacity-90"
          onClick={book}
        >
          {t("public.bookClass")}
        </Button>
      </div>
    </>
  )
}

/**
 * A space or a lesson, once a time is picked: the same card as a chosen group class (weekday
 * colour, date, time, name, price, Remove and Book) so every kind of booking reads the same.
 */
function ChosenSlot({
  title,
  startsAt,
  minutes,
  name,
  price,
  currency,
  checkout,
  onClear,
}: {
  title: string
  startsAt: string
  minutes: number
  name: string
  price?: number
  currency: string
  checkout: Selection
  onClear: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { slug, business } = usePublic()
  const tz = business.timezone
  const endsAt = new Date(
    new Date(startsAt).getTime() + minutes * 60_000,
  ).toISOString()
  const day = dayColorOf(startsAt, tz)
  const card = useRef<HTMLDivElement>(null)
  const scrolledAway = useScrolledPast(card)
  // a time is picked but not booked yet: leaving the page asks first
  useUnsaved(true, "booking")
  const book = () => {
    releaseBooking()
    navigate(`/b/${slug}/book?${selectionQuery(checkout)}`)
  }
  const detail = [
    name,
    duration(minutes),
    price !== undefined ? money(price, currency) : undefined,
  ]
    .filter(Boolean)
    .join(" · ")
  return (
    <>
      {scrolledAway && (
        <PinnedBar
          day={day}
          title={title}
          when={`${dayIn(startsAt, tz)} · ${timeIn(startsAt, tz)}–${timeIn(endsAt, tz)}`}
          detail={detail}
          bookLabel={t("public.book")}
          onBook={book}
          onClear={onClear}
        />
      )}
      <div
        ref={card}
        style={{
          background: day.bg,
          color: day.fg,
          boxShadow: `inset 0 0 0 1px ${day.ink}33`,
        }}
        className="space-y-3 rounded-xl p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold opacity-80">{title}</p>
          {/* not wanted after all: remove it here, then pick another time */}
          <button
            type="button"
            onClick={onClear}
            className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium opacity-90 hover:bg-black/5 hover:opacity-100 focus-visible:ring-3 focus-visible:ring-black/30 focus-visible:outline-none"
          >
            <XIcon className="size-4" />
            {t("public.removeBooking")}
          </button>
        </div>
        <div>
          <p className="display-tight text-2xl">{longDayIn(startsAt, tz)}</p>
          <p className="display-tight text-xl tabular-nums">
            {timeIn(startsAt, tz)}–{timeIn(endsAt, tz)}
          </p>
          <p className="mt-1 font-medium">{name}</p>
          <p className="text-sm opacity-80">
            {[
              duration(minutes),
              price !== undefined ? money(price, currency) : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Button
          size="lg"
          style={{ background: day.ink, color: "#ffffff" }}
          className="h-12 w-full text-base hover:opacity-90"
          onClick={book}
        >
          {t("public.bookThisTime")}
        </Button>
      </div>
    </>
  )
}

function SeatStepper({
  value,
  max,
  onChange,
}: {
  value: number
  max: number
  onChange: (n: number) => void
}) {
  const { t } = useTranslation()
  const btn =
    "flex size-11 items-center justify-center rounded-full border border-black/10 bg-white text-xl disabled:opacity-40"
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className={btn}
        aria-label={t("public.fewerSeats")}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span
        className="w-6 text-center display-tight text-2xl tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={btn}
        aria-label={t("public.moreSeats")}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}

function EmptyDay({
  classes,
  onNextDay,
}: {
  classes?: boolean
  onNextDay: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border border-dashed border-black/15 bg-white px-4 py-6 text-center">
      <p className="mb-3 text-muted-foreground">
        {classes ? t("public.noClasses") : t("public.noTimes")}
      </p>
      <button
        type="button"
        onClick={onNextDay}
        className="h-11 rounded-full border border-black/10 px-5 text-sm font-medium"
      >
        {t("public.nextDay")}
      </button>
    </div>
  )
}

function SlotSkeleton() {
  return (
    <div
      className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6"
      aria-busy="true"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-xl" />
      <SlotSkeleton />
    </div>
  )
}
