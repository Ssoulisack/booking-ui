import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  InfoIcon,
  LayersIcon,
  MinusIcon,
  PhoneIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api/client"
import type { PublicArea, PublicTable } from "@/lib/api/types"
import { checkTables, floorName } from "@/lib/floor-plan"
import { dayIn, nextDays, timeIn } from "@/lib/format"
import { cn } from "@/lib/utils"
import { releaseTables, useUnsaved } from "@/stores/unsaved"

import { useFloorPlans, useTableAvailability } from "./api"
import { DateStrip, Step } from "./BookingPanel"
import { usePublic } from "./context"
import { dayBrandStyle } from "./day-colors"
import { EventWhen } from "./EventProgram"
import { selectionQuery, tableIdsOf, useSelection } from "./selection"
import { TablePlan, type StaffTable } from "./TablePlan"

const DAYS_AHEAD = 30
const DEFAULT_GUESTS = 2

/**
 * A restaurant's booking panel: the day, how many people, the time, then the tables on the floor
 * plan (one, or several next to each other for a big group). Everything is kept in the address.
 */
export function TableBookingPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { slug, business } = usePublic()
  const tz = business.timezone
  const [sel, setSel] = useSelection()

  const days = useMemo(() => nextDays(tz, DAYS_AHEAD), [tz])
  const date = sel.date && days.includes(sel.date) ? sel.date : days[0]
  const guests = sel.guests ?? DEFAULT_GUESTS
  const plans = useFloorPlans(slug)
  const avail = useTableAvailability(slug, { date, guests })
  const max = avail.data?.max_guests_online ?? 20
  const tooMany =
    avail.error instanceof ApiError &&
    avail.error.code === "TOO_MANY_GUESTS_ONLINE"

  const times = avail.isPlaceholderData ? [] : (avail.data?.times ?? [])
  // a bar books the evening: no time to pick, the one evening is the choice
  const barStyle = avail.data?.booking_style === "arrive_by"
  const time = barStyle
    ? times[0]
    : times.find((x) => x.starts_at === sel.start)
  const chosenIds = tableIdsOf(sel)

  // the areas and floors to show; the floor of a chosen table, else the floor with the most free tables
  const areas = plans.data ?? []
  const allTables = areas.flatMap((a) =>
    a.tables.map((tb) => ({ ...tb, sport_id: a.id })),
  )
  const freeIds = new Set(time?.free_table_ids ?? [])
  const floors = [...new Set(areas.map((a) => a.floor))]
  const freeOn = (f: number) =>
    areas
      .filter((a) => a.floor === f)
      .reduce((n, a) => n + a.tables.filter((x) => freeIds.has(x.id)).length, 0)
  const chosenArea = areas.find((a) =>
    a.tables.some((x) => chosenIds.includes(x.id)),
  )
  const [floorPick, setFloorPick] = useState<number | null>(null)
  const floor =
    chosenArea?.floor ??
    (floorPick !== null && floors.includes(floorPick)
      ? floorPick
      : [...floors].sort((a, b) => freeOn(b) - freeOn(a))[0])

  const choose = (patch: Partial<typeof sel>) => setSel({ ...sel, ...patch })
  const toggle = (id: number) => {
    const next = chosenIds.includes(id)
      ? chosenIds.filter((x) => x !== id)
      : [...chosenIds, id]
    choose({ tables: next.length ? next.join("-") : undefined })
  }
  // another floor: its tables cannot be joined with this floor's, so the choice starts again
  const goFloor = (f: number) => {
    setFloorPick(f)
    if (chosenIds.length) choose({ tables: undefined })
  }

  // the chosen tables against the rules
  const chosen = allTables.filter((x) => chosenIds.includes(x.id))
  const freeTables = allTables.filter((x) => freeIds.has(x.id))
  const check = time ? checkTables(chosen, guests, freeTables) : null

  // step by step: 1 day and people (and time), 2 the table, 3 confirm (the checkout page)
  const onTables = sel.step === "table" && !!time
  // chosen tables are lost when going back a step or leaving the page: UnsavedGuard asks first
  useUnsaved(onTables && chosenIds.length > 0, "tables")
  const toTop = () =>
    document
      .getElementById("book")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  const next = () => {
    if (!time) return
    setSel(
      { ...sel, step: "table", date, guests, start: time.starts_at },
      { push: true },
    )
    toTop()
  }
  const back = () => {
    choose({ step: undefined, tables: undefined })
    toTop()
  }

  return (
    // once a day is picked, the panel takes its colour (Monday yellow, Tuesday pink, …)
    <div className="space-y-7" style={dayBrandStyle(sel.date && date, tz)}>
      {/* the same place as on the Confirm page: Back above the steps */}
      {onTables && time && (
        <Button variant="ghost" className="-mb-1 -ml-3 h-11" onClick={back}>
          <ArrowLeftIcon />
          {t("public.tables.back")}
        </Button>
      )}
      <StepBar at={onTables ? 2 : 1} />
      {!onTables && (
        <>
          <Step title={t("public.step.day")}>
            <DateStrip
              days={days}
              value={date}
              tz={tz}
              onChange={(d) =>
                choose({ date: d, start: undefined, tables: undefined })
              }
            />
          </Step>

          <Step title={t("public.tables.howMany")}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-card p-1.5 ring-1 ring-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="size-11"
                  aria-label={t("public.tables.fewer")}
                  disabled={guests <= 1}
                  onClick={() =>
                    choose({ guests: guests - 1, tables: undefined })
                  }
                >
                  <MinusIcon />
                </Button>
                <span className="flex min-w-20 items-center justify-center gap-1.5 display-tight text-2xl tabular-nums">
                  <UsersIcon className="size-5" />
                  {guests}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="size-11"
                  aria-label={t("public.tables.more")}
                  disabled={guests >= max}
                  onClick={() =>
                    choose({ guests: guests + 1, tables: undefined })
                  }
                >
                  <PlusIcon />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("public.tables.guestsCount", { count: guests })}
              </p>
            </div>
            {(guests >= max || tooMany) && (
              <BigGroup phone={business.phone} max={max} />
            )}
          </Step>

          {/* an event held in some areas: say so, the other areas are booked below as usual */}
          {avail.data?.event &&
            !avail.isPlaceholderData &&
            avail.data.event.areas.length > 0 && (
              <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-border">
                <p>
                  {t("public.events.eventDayPartial", {
                    date: dayIn(`${date}T12:00:00+00:00`, "UTC"),
                    name: avail.data.event.name,
                    areas: avail.data.event.areas.map((a) => a.name).join(", "),
                  })}
                </p>
                <EventWhen
                  start={avail.data.event.start_time}
                  end={avail.data.event.end_time}
                  areas={[]}
                />
                <Button asChild variant="outline" className="h-11">
                  <Link
                    to={`/b/${slug}/events/${avail.data.event.id}?date=${date}`}
                  >
                    {t("public.events.seeEvent")}
                  </Link>
                </Button>
              </div>
            )}
          {avail.data?.event &&
          !avail.isPlaceholderData &&
          avail.data.event.areas.length === 0 ? (
            // an event held everywhere takes the day over: its tables are sold, not booked free
            <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-border">
              <p>
                {t("public.events.eventDay", {
                  date: dayIn(`${date}T12:00:00+00:00`, "UTC"),
                  name: avail.data.event.name,
                })}
              </p>
              <EventWhen
                start={avail.data.event.start_time}
                end={avail.data.event.end_time}
                areas={[]}
              />
              <Button asChild className="h-11">
                <Link
                  to={`/b/${slug}/events/${avail.data.event.id}?date=${date}`}
                >
                  {t("public.events.seeEvent")}
                </Link>
              </Button>
            </div>
          ) : barStyle ? (
            // a bar: nothing to pick here; say so only when no table is left that evening
            avail.data &&
            !avail.isPlaceholderData &&
            !time && (
              <div className="space-y-3 rounded-xl bg-card p-4">
                <p>{t("public.tables.noTable", { count: guests })}</p>
                {days[days.indexOf(date) + 1] && (
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() =>
                      choose({
                        date: days[days.indexOf(date) + 1],
                        tables: undefined,
                      })
                    }
                  >
                    {t("public.tryNextDay")}
                  </Button>
                )}
              </div>
            )
          ) : (
            <Step title={t("public.step.time")}>
              {avail.isError && !tooMany ? (
                <ErrorAlert error={avail.error} />
              ) : !avail.data || avail.isPlaceholderData ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} className="h-12 rounded-xl" />
                  ))}
                </div>
              ) : times.length === 0 ? (
                <div className="space-y-3 rounded-xl bg-card p-4">
                  <p>{t("public.tables.noTime", { count: guests })}</p>
                  {days[days.indexOf(date) + 1] && (
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={() =>
                        choose({
                          date: days[days.indexOf(date) + 1],
                          start: undefined,
                          tables: undefined,
                        })
                      }
                    >
                      {t("public.tryNextDay")}
                    </Button>
                  )}
                </div>
              ) : (
                <div
                  role="radiogroup"
                  aria-label={t("public.step.time")}
                  className="grid grid-cols-4 gap-2 sm:grid-cols-6"
                >
                  {times.map((x) => {
                    const selected = x.starts_at === sel.start
                    return (
                      <button
                        key={x.starts_at}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          choose({ start: x.starts_at, tables: undefined })
                        }
                        className={cn(
                          "h-12 rounded-xl border text-base font-semibold tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
                          selected
                            ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
                            : "border-border bg-card active:bg-[var(--brand-soft)]",
                        )}
                      >
                        {timeIn(x.starts_at, tz)}
                      </button>
                    )
                  })}
                </div>
              )}
            </Step>
          )}
          <Button
            size="lg"
            className="h-12 w-full bg-[var(--brand)] text-base text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
            disabled={
              !time ||
              tooMany ||
              (!!avail.data?.event && avail.data.event.areas.length === 0)
            }
            onClick={next}
          >
            {t("public.tables.next")}
          </Button>
        </>
      )}

      {onTables && time && (
        <div>
          <p className="rounded-xl bg-card p-4 font-semibold ring-1 ring-border">
            {dayIn(time.starts_at, tz)}
            {!barStyle && `, ${timeIn(time.starts_at, tz)}`} ·{" "}
            {t("public.tables.guestsCount", { count: guests })}
          </p>
        </div>
      )}

      {onTables && time && (
        <Step title={t("public.tables.pickTable")}>
          {plans.isError ? (
            <ErrorAlert error={plans.error} />
          ) : !plans.data ? (
            <Skeleton className="aspect-[5/3] w-full rounded-xl" />
          ) : (
            <Plans
              areas={areas}
              floors={floors}
              floor={floor}
              free={freeIds}
              chosen={new Set(chosenIds)}
              onFloor={goFloor}
              onToggle={toggle}
            />
          )}
          <Legend
            kept={areas.some((a) => a.tables.some((x) => x.walk_in_only))}
          />
          {time.extra_chairs_allowed && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
              {t("public.tables.extraOnly")}
            </p>
          )}
          <ChoiceBar
            guests={guests}
            chosen={chosen}
            check={check}
            onBack={back}
            onContinue={() => {
              releaseTables()
              navigate(
                `/b/${slug}/book?${selectionQuery({ ...sel, step: undefined, date, guests, start: time.starts_at })}`,
              )
            }}
          />
        </Step>
      )}
    </div>
  )
}

/** Where the visitor is: 1 day and people, 2 table, 3 confirm */
export function StepBar({
  at,
  kind = "table",
}: {
  at: number
  /** a table booking, or a court booking (date & duration, [coach,] time, confirm) */
  kind?: "table" | "time" | "coachTime" | "event"
}) {
  const { t } = useTranslation()
  const steps =
    kind === "event"
      ? [
          t("public.events.steps.tables"),
          t("public.tables.steps.confirm"),
          t("public.events.steps.pay"),
        ]
      : kind === "table"
        ? [
            t("public.tables.steps.when"),
            t("public.tables.steps.table"),
            t("public.tables.steps.confirm"),
          ]
        : [
            t("public.tables.steps.whenLength"),
            ...(kind === "coachTime" ? [t("public.tables.steps.coach")] : []),
            t("public.tables.steps.time"),
            t("public.tables.steps.confirm"),
          ]
  return (
    <ol
      className={cn(
        "grid gap-2",
        steps.length === 4 ? "grid-cols-4" : "grid-cols-3",
      )}
      aria-label={t("public.tables.steps.label")}
    >
      {steps.map((label, i) => {
        const n = i + 1
        return (
          <li
            key={label}
            aria-current={n === at ? "step" : undefined}
            className="space-y-1.5"
          >
            <span
              className={cn(
                "block h-1.5 rounded-full",
                n <= at ? "bg-[var(--brand)]" : "bg-black/10",
              )}
            />
            <span
              className={cn(
                "block text-xs sm:text-sm",
                n === at ? "font-semibold" : "text-muted-foreground",
              )}
            >
              {n}. {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Floor tabs (when the place has several), the floor's areas, and each area's plan */
export function Plans({
  areas,
  floors,
  floor,
  free,
  chosen,
  onFloor,
  onToggle,
  staffLook,
  priceLabel,
  tint,
}: {
  areas: PublicArea[]
  floors: number[]
  floor: number
  free: Set<number>
  chosen: Set<number>
  onFloor: (f: number) => void
  onToggle: (id: number) => void
  staffLook?: (id: number) => StaffTable
  priceLabel?: (id: number) => string | undefined
  tint?: (id: number) => string | undefined
}) {
  const { t } = useTranslation()
  const onThisFloor = areas.filter((a) => a.floor === floor)
  // one area at a time: the one picked, else the one holding a chosen table, else the one with most free tables
  const [areaPick, setAreaPick] = useState<number | null>(null)
  const freeIn = (a: PublicArea) =>
    a.tables.filter((x) => free.has(x.id)).length
  const area =
    onThisFloor.find((a) => a.id === areaPick) ??
    onThisFloor.find((a) => a.tables.some((x) => chosen.has(x.id))) ??
    [...onThisFloor].sort((a, b) => freeIn(b) - freeIn(a))[0]
  return (
    <div className="space-y-4">
      {floors.length > 1 && (
        <div
          role="tablist"
          aria-label={t("public.tables.floors")}
          className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4"
        >
          {floors.map((f) => (
            <button
              key={f}
              role="tab"
              type="button"
              aria-selected={f === floor}
              onClick={() => {
                setAreaPick(null)
                onFloor(f)
              }}
              className={cn(
                "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium",
                f === floor
                  ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
                  : "border-border bg-card",
              )}
            >
              <LayersIcon className="size-4" />
              {floorName(t, f)}
            </button>
          ))}
        </div>
      )}
      {onThisFloor.length > 1 && (
        <div
          role="tablist"
          aria-label={t("public.tables.areas")}
          className="-mx-4 no-scrollbar flex gap-1 overflow-x-auto border-b px-4"
        >
          {onThisFloor.map((a) => (
            <button
              key={a.id}
              role="tab"
              type="button"
              aria-selected={a.id === area?.id}
              onClick={() => setAreaPick(a.id)}
              className={cn(
                "flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium",
                a.id === area?.id
                  ? "border-[var(--brand)] text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {a.name}
              <span className="text-xs font-normal text-muted-foreground">
                {t("public.tables.freeCount", { count: freeIn(a) })}
              </span>
            </button>
          ))}
        </div>
      )}
      {area && (
        <TablePlan
          area={area}
          free={free}
          chosen={chosen}
          onToggle={onToggle}
          staffLook={staffLook}
          priceLabel={priceLabel}
          tint={tint}
          onStairs={(f) => {
            setAreaPick(null)
            onFloor(f)
          }}
        />
      )}
    </div>
  )
}

function Legend({ kept }: { kept: boolean }) {
  const { t } = useTranslation()
  const dot = "inline-block size-3.5 rounded border-2"
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className={cn(dot, "border-[var(--brand)]/60 bg-card")} />
        {t("public.tables.legendFree")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={cn(dot, "border-[var(--brand)] bg-[var(--brand)]")} />
        {t("public.tables.legendChosen")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={cn(dot, "border-dashed border-black/20 bg-muted")} />
        {t("public.tables.legendTaken")}
      </span>
      {kept && (
        <span className="flex items-center gap-1.5">
          <span className={cn(dot, "border-sky-400 bg-sky-50")} />
          {t("public.tables.legendKept")}
        </span>
      )}
    </p>
  )
}

/** What is chosen and whether it fits the group; Continue once it does */
function ChoiceBar({
  guests,
  chosen,
  check,
  onBack,
  onContinue,
}: {
  onBack: () => void
  guests: number
  chosen: Array<PublicTable & { sport_id: number }>
  check: ReturnType<typeof checkTables> | null
  onContinue: () => void
}) {
  const { t } = useTranslation()
  const ok = check?.ok
  return (
    <div className="sticky bottom-24 z-30 space-y-3 rounded-xl bg-card p-4 shadow-lg ring-1 ring-border lg:bottom-4">
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0">
          <p className="font-semibold">
            {chosen.length === 0
              ? t("public.tables.tapTable", { count: guests })
              : t("public.tables.summary", {
                  tables: chosen.map((x) => x.name).join(" + "),
                  count: guests,
                  seats: check?.seats ?? 0,
                })}
          </p>
          {check && !check.ok && chosen.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t(`public.tables.why.${check.code}`, { count: guests })}
            </p>
          )}
          {check?.ok && check.extraUsed && (
            <p className="text-sm text-muted-foreground">
              {t("public.tables.withExtra")}
            </p>
          )}
        </div>
      </div>
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
          disabled={!ok}
          onClick={onContinue}
        >
          {t("public.continue")}
        </Button>
      </div>
    </div>
  )
}

/** More people than can book online: call the place */
function BigGroup({ phone, max }: { phone: string; max: number }) {
  const { t } = useTranslation()
  const tel = phone.replace(/[^\d+]/g, "")
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-3 text-sm ring-1 ring-border">
      <p>{t("public.tables.bigGroup", { count: max })}</p>
      {tel && (
        <Button asChild variant="outline" className="h-11">
          <a href={`tel:${tel}`}>
            <PhoneIcon />
            {t("public.call")}
          </a>
        </Button>
      )}
    </div>
  )
}
