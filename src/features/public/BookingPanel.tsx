import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react"
import { lazy, Suspense, useMemo, useState, type CSSProperties } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { ErrorAlert } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { ClassSession } from "@/types/class"
import type { PublicCoach, PublicResource } from "@/types/public"
import {
  dayIn,
  duration,
  longDayIn,
  middayOf,
  money,
  nextDays,
  timeIn,
  todayIn,
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
  useUpcomingClassPages,
} from "@/hooks/use-public"
import { BookingBar } from "./BookingBar"
import { brandStyle } from "./brand"
import { kindOf } from "./booking-utils"
import { StepBar } from "./TableBookingPanel"
import { usePublic } from "./context"
import { dayBrandStyle, dayColorOf } from "./day-colors"
import { usePubMode } from "./theme"
import {
  selectionQuery,
  useSelection,
  type BookWhat,
  type Selection,
} from "./selection"
import { lengthsOf } from "@/components/global/booking/lengths"
import AnimatedList from "@/components/reactbits/AnimatedList"
import { TimePicker } from "@/components/global/booking/TimePicker"

// the month calendar is only needed after "More dates": load it then
const Calendar = lazy(async () => ({
  default: (await import("@/components/ui/calendar")).Calendar,
}))

const DEFAULT_DAYS = 14
const MAX_DAYS = 30

/**
 * Pick a sport, then a space (with or without a coach) or a class, a day, a length and a start. Every choice is
 * kept in the URL; the bar at the bottom shows the price and goes to checkout.
 */
export function BookingPanel() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const tz = business.timezone
  const [sel, setSel] = useSelection()
  const navigate = useNavigate()

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
  // a coach is never booked alone: it is an extra on a space (asked in step 1)
  const options = (
    [courts.length > 0 && "court", hasClasses && "class"] as Array<
      BookWhat | false
    >
  ).filter((o): o is BookWhat => !!o)
  const what = sel.what && options.includes(sel.what) ? sel.what : options[0]

  const court =
    what === "court"
      ? (courts.find((c) => c.id === sel.court) ?? courts[0])
      : undefined
  const withCoach =
    what === "court" && sportCoaches.length > 0 && !!sel.withCoach
  const coach = withCoach
    ? sportCoaches.find((c) => c.id === sel.coach)
    : undefined

  // courts go step by step: 1 date, coach or not and length, 2 the coach (only with a coach),
  // 3 the time, then confirm (checkout)
  const timeFlow = what === "court"
  const step =
    timeFlow && sel.step === "time" && (!withCoach || coach)
      ? "time"
      : timeFlow && withCoach && (sel.step === "coach" || sel.step === "time")
        ? "coach"
        : "when"

  const [daysAhead, setDaysAhead] = useState(DEFAULT_DAYS)
  const days = useMemo(() => nextDays(tz, daysAhead), [tz, daysAhead])
  const date = sel.date && days.includes(sel.date) ? sel.date : days[0]

  // the coach only narrows the free times once they are chosen (the time step)
  const query =
    what === "court" && sport
      ? {
          date,
          resource_id: court?.id,
          coach_id: step === "time" ? coach?.id : undefined,
          sport_id: sport.id,
        }
      : null
  const availability = useAvailability(slug, query)
  // spaces: once the rules are known, offer exactly the days that can be booked
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
      <p className="rounded-xl bg-card p-6 text-muted-foreground">
        {t("public.nothingToBook")}
      </p>
    )
  }

  const next = () =>
    setSel(
      { ...sel, step: withCoach ? "coach" : "time", date, length },
      { push: true },
    )
  const toTime = () => setSel({ ...sel, step: "time" }, { push: true })
  const back = () =>
    setSel({
      ...sel,
      step: step === "time" && withCoach ? "coach" : undefined,
      start: undefined,
    })
  const target = [court?.name, coach?.name].filter(Boolean).join(" + ")
  const steps = withCoach ? 4 : 3
  const at = step === "when" ? 1 : step === "coach" ? 2 : steps - 1

  return (
    // once a day is picked, the panel takes its colour (Monday yellow, Tuesday pink, …)
    <div className="space-y-6" style={dayBrandStyle(sel.date && date, tz)}>
      {step !== "when" && (
        <Button variant="ghost" className="-mb-1 -ml-3 h-11" onClick={back}>
          <ArrowLeftIcon />
          {t("public.tables.back")}
        </Button>
      )}
      {timeFlow && <StepBar at={at} kind={withCoach ? "coachTime" : "time"} />}

      {step === "when" && (
        <>
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

          {what === "court" && sportCoaches.length > 0 && (
            <Step title={t("public.coachQuestion")}>
              <Chips
                label={t("public.coachQuestion")}
                items={[
                  { id: 0, label: t("public.noCoach") },
                  { id: 1, label: t("public.withCoach") },
                ]}
                value={withCoach ? 1 : 0}
                onChange={(on) =>
                  choose({
                    withCoach: on || undefined,
                    coach: on ? sel.coach : undefined,
                    start: undefined,
                  })
                }
              />
            </Step>
          )}

          {what === "class" ? (
            <>
              <ClassList
                date={date}
                sportId={sport.id}
                value={sel.cls}
                seats={sel.seats ?? 1}
                onChange={(cls, seats) => choose({ cls, seats })}
                onNextDay={() => {
                  const next = days[days.indexOf(date) + 1]
                  if (next) choose({ date: next, cls: undefined })
                }}
              />
              <ComingUpClasses
                sportId={sport.id}
                days={days}
                onPick={(c) =>
                  setSel({
                    sport: sport.id,
                    what: "class",
                    date: todayIn(tz, new Date(c.starts_at)),
                    cls: c.id,
                    seats: 1,
                  })
                }
              />
            </>
          ) : (
            <section className="space-y-6">
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
                <div
                  className={cn(availability.isPlaceholderData && "opacity-60")}
                >
                  <TimePicker
                    part="length"
                    availability={availability.data}
                    tz={tz}
                    start={sel.start}
                    length={sel.length}
                    disabled={availability.isPlaceholderData}
                    onChange={(start, length) => choose({ start, length })}
                  />
                </div>
              )}
              <Button
                size="lg"
                className="h-12 w-full bg-[var(--brand)] text-base text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
                disabled={
                  !availability.data ||
                  availability.isPlaceholderData ||
                  availability.data.slots.length === 0
                }
                onClick={next}
              >
                {withCoach ? t("public.nextCoach") : t("public.nextTime")}
              </Button>
            </section>
          )}
        </>
      )}

      {step === "coach" && (
        <>
          <p className="rounded-xl bg-card p-4 font-semibold ring-1 ring-border">
            {court?.name} · {dayIn(`${date}T12:00:00`, tz)} · {duration(length)}
          </p>
          <Step title={t("public.step.coach")}>
            <TargetList
              items={sportCoaches}
              value={coach?.id}
              onChange={(id) => choose({ coach: id, start: undefined })}
            />
          </Step>
          <div className="sticky bottom-24 z-30 grid grid-cols-[auto_1fr] gap-2 rounded-xl bg-card p-4 shadow-lg ring-1 ring-border lg:bottom-4">
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 px-5 text-base"
              onClick={back}
            >
              <ArrowLeftIcon />
              {t("public.tables.back")}
            </Button>
            <Button
              size="lg"
              className="h-12 bg-[var(--brand)] text-base text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
              disabled={!coach}
              onClick={toTime}
            >
              {t("public.nextTime")}
            </Button>
          </div>
        </>
      )}

      {step === "time" &&
        (availability.isError ? (
          <ErrorAlert error={availability.error} />
        ) : !availability.data || availability.isPlaceholderData ? (
          <SlotSkeleton />
        ) : (
          <>
            <p className="rounded-xl bg-card p-4 font-semibold ring-1 ring-border">
              {target} · {dayIn(`${date}T12:00:00`, tz)} · {duration(length)}
              {price !== undefined &&
                availability.data.currency &&
                ` · ${money(price, availability.data.currency)}`}
            </p>
            {availability.data.slots.length === 0 ? (
              <EmptyDay
                onNextDay={() => {
                  const next = days[days.indexOf(date) + 1]
                  if (next) choose({ date: next, start: undefined })
                }}
              />
            ) : (
              <TimePicker
                part="time"
                availability={availability.data}
                tz={tz}
                start={sel.start}
                length={length}
                onChange={(start, length) => choose({ start, length })}
              />
            )}
            <TimeBar
              slot={slot?.starts_at}
              minutes={length}
              tz={tz}
              onBack={back}
              onContinue={() => {
                releaseBooking()
                navigate(
                  `/b/${slug}/book?${selectionQuery({
                    sport: sport.id,
                    what,
                    court: court?.id,
                    coach: coach?.id,
                    date,
                    start: slot!.starts_at,
                    length,
                  })}`,
                )
              }}
            />
          </>
        ))}
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

/** The chosen start and its end; Back to the length, Continue to confirm */
function TimeBar({
  slot,
  minutes,
  tz,
  onBack,
  onContinue,
}: {
  slot?: string
  minutes: number
  tz: string
  onBack: () => void
  onContinue: () => void
}) {
  const { t } = useTranslation()
  // a time picked but not booked: leaving the page asks first
  useUnsaved(!!slot, "booking")
  const end = slot
    ? new Date(Date.parse(slot) + minutes * 60_000).toISOString()
    : undefined
  return (
    <div className="sticky bottom-24 z-30 space-y-3 rounded-xl bg-card p-4 shadow-lg ring-1 ring-border lg:bottom-4">
      <p className="font-semibold">
        {slot
          ? `${timeIn(slot, tz)}–${timeIn(end!, tz)} · ${duration(minutes)}`
          : t("public.pickTime")}
      </p>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-12 px-5 text-base"
          onClick={onBack}
        >
          <ArrowLeftIcon />
          {t("public.tables.back")}
        </Button>
        <Button
          size="lg"
          className="h-12 bg-[var(--brand)] text-base text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
          disabled={!slot}
          onClick={onContinue}
        >
          {t("public.continue")}
        </Button>
      </div>
    </div>
  )
}

/**
 * Group class tab: the next classes of this sport (React Bits AnimatedList, more load as it is
 * scrolled). Tapping one opens its day above with the class picked.
 */
function ComingUpClasses({
  sportId,
  days,
  onPick,
}: {
  sportId: number
  days: string[]
  onPick: (c: ClassSession) => void
}) {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const tz = business.timezone
  const pages = useUpcomingClassPages(slug)
  const coaches = useCoaches(slug).data ?? []
  const spaces = useResources(slug).data ?? []
  const last = days[days.length - 1]
  // only this sport, and only days the calendar above can show
  const items = (pages.data?.pages.flatMap((p) => p.items) ?? []).filter(
    (c) => c.sport_id === sportId && todayIn(tz, new Date(c.starts_at)) <= last,
  )
  if (items.length === 0) return null
  return (
    <Step title={t("public.classesTitle")} candy="sky">
      <AnimatedList
        items={items}
        onEndReached={() => {
          if (pages.hasNextPage && !pages.isFetchingNextPage) {
            void pages.fetchNextPage({ cancelRefetch: false })
          }
        }}
        maxHeight={340}
        theme="light"
        width="100%"
        accentColor="var(--brand)"
        animateOnce
        onItemSelect={(c) => {
          onPick(c)
          document
            .getElementById("book")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        renderItem={(c) => {
          const place = [
            spaces.find((x) => x.id === c.resource_id)?.name,
            coaches.find((x) => x.id === c.coach_id)?.name,
          ]
            .filter(Boolean)
            .join(" · ")
          const left = c.seats_left ?? c.capacity
          return (
            <>
              {/* the colour of the weekday (Monday yellow, Tuesday pink, …) */}
              <div
                className="w-20 shrink-0 rounded-xl py-1.5 text-center"
                style={{
                  background: dayColorOf(c.starts_at, tz).bg,
                  color: dayColorOf(c.starts_at, tz).fg,
                }}
              >
                <p className="text-xs opacity-90">{dayIn(c.starts_at, tz)}</p>
                <p className="display-tight text-xl tabular-nums">
                  {timeIn(c.starts_at, tz)}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.title}</p>
                {place && (
                  <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                    <MapPinIcon className="size-4 shrink-0" />
                    {place}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <UsersIcon className="size-4 shrink-0" />
                  {left > 0
                    ? t("public.seatsLeft", { count: left })
                    : t("public.classFull")}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium">
                {money(c.price, c.currency)}
              </p>
            </>
          )
        }}
      />
    </Step>
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
  // a class is picked but not booked yet: leaving the page asks first
  useUnsaved(!!c, "booking")
  if (!c) return null
  return (
    <BookingBar
      // Book takes the colour of the weekday the class is on (Monday yellow, Tuesday pink, …)
      color={dayColorOf(c.starts_at, tz).ink}
      summary={c.title}
      when={`${dayIn(c.starts_at, tz)} · ${timeIn(c.starts_at, tz)}–${timeIn(c.ends_at, tz)}`}
      price={c.price * seats}
      currency={c.currency}
      checkout={{ sport: sportId, what: "class", date, cls, seats }}
    />
  )
}

export function Step({
  title,
  children,
  candy,
}: {
  title: string
  children: React.ReactNode
  /** a bright section label (e.g. "sky") instead of a plain title */
  candy?: "yellow" | "sky" | "purple" | "orange" | "pink" | "green"
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">
        {candy ? (
          <span
            className="candy-label text-lg font-extrabold"
            style={
              { "--candy": `var(--candy-${candy})` } as React.CSSProperties
            }
          >
            {title}
          </span>
        ) : (
          title
        )}
      </h3>
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
                : "border-border bg-card text-foreground active:bg-[var(--brand-soft)]",
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
              "flex min-h-16 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
              selected
                ? "border-[var(--brand)] ring-2 ring-[var(--brand)]"
                : "border-border active:bg-[var(--brand-soft)]",
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
export function DateStrip({
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
  const mode = usePubMode()
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
                  "border-border bg-card active:bg-[var(--brand-soft)]",
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
          className="flex h-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 bg-card px-3 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring"
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
              ...brandStyle(business.brand_color, business, mode),
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
  onNextDay,
}: {
  date: string
  sportId: number
  value?: number
  seats: number
  onChange: (cls: number, seats: number) => void
  onNextDay: () => void
}) {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const tz = business.timezone
  const classes = useClassesOn(slug, date)
  const list = (classes.data ?? []).filter((c) => c.sport_id === sportId)
  const coaches = useCoaches(slug).data ?? []
  const spaces = useResources(slug).data ?? []

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
                "rounded-xl border bg-card",
                selected
                  ? "border-[var(--brand)] ring-2 ring-[var(--brand)]"
                  : "border-border",
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
                {/* where the class is held, and who leads it */}
                {(c.resource_id || c.coach_id) && (
                  <span className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPinIcon className="mt-px size-4 shrink-0" />
                    {[
                      spaces.find((x) => x.id === c.resource_id)?.name,
                      coaches.find((x) => x.id === c.coach_id)?.name,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <UsersIcon className="size-4" />
                  {full
                    ? t("public.classFull")
                    : t("public.seatsLeft", { count: left })}
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
    </Step>
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
    "flex size-11 items-center justify-center rounded-full border border-border bg-card text-xl disabled:opacity-40"
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
    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center">
      <p className="mb-3 text-muted-foreground">
        {classes ? t("public.noClasses") : t("public.noTimes")}
      </p>
      <button
        type="button"
        onClick={onNextDay}
        className="h-11 rounded-full border border-border px-5 text-sm font-medium"
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
