import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  InfoIcon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"

import { ErrorAlert } from "@/components/global/form"
import HoldButton from "@/components/reactbits/HoldButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Stepper } from "@/components/global/Stepper"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api/client"
import { floorName } from "@/lib/floor-plan"
import { dayIn, money } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSession } from "@/stores/session"

import {
  useBuyEventTables,
  useEventDetail,
  useFloorPlans,
  usePaymentOptions,
  usePublicPayInfo,
} from "@/hooks/use-public"
import { usePublic } from "./context"
import { EventLineup, EventWhen } from "./EventProgram"
import { eventDays } from "./event-program"
import { rememberPay } from "./EventPay"
import { PhoneNeeded } from "./PhoneNeeded"
import { Plans, StepBar } from "./TableBookingPanel"

/** Tables of one price share a colour; the cheapest first */
const PRICE_COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#64748b",
]

// how long Confirm is held (the same as a normal booking)
const HOLD_MS = 1000

/** 1500000 → "1.5M", 250000 → "250k" */
function compact(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}k`
  return String(n)
}

/**
 * /b/:slug/events/:eventId — an event day, step by step like a normal booking:
 * 1 choose tables at their prices, 2 check the booking and hold to confirm, 3 pay (the confirmed page).
 * The day, the tables and the step are kept in the address, so Back keeps the choice.
 */
export function EventPage() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const navigate = useNavigate()
  const id = Number(useParams().eventId)
  const [params, setParams] = useSearchParams()
  const date = params.get("date") ?? ""
  const detail = useEventDetail(slug, id, date)
  const plans = useFloorPlans(slug)
  const user = useSession((s) => s.user)
  const buy = useBuyEventTables(slug, id)
  // how this branch takes the money decides what the hold note says (no slip talk when it takes none)
  const online = !!usePaymentOptions(slug).data?.length
  const transfer = usePublicPayInfo(slug).data?.transfer_enabled ?? true
  const payWay = online
    ? transfer
      ? "both"
      : "online"
    : transfer
      ? "slip"
      : "team"

  const chosen = (params.get("tables") ?? "")
    .split("-")
    .map(Number)
    .filter((n) => n > 0)
  const wantsConfirm = params.get("step") === "confirm"
  const change = (patch: Record<string, string | undefined>, push = false) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      },
      { replace: !push },
    )
  const setChosen = (ids: number[]) =>
    change({ tables: ids.length ? ids.join("-") : undefined, step: undefined })

  // the group size can come from the address ("Start over" after a wrong bank), then it follows the tables' capacity
  const [guestsPick, setGuestsPick] = useState<number | null>(() => {
    const g = Number(params.get("guests"))
    return g > 0 ? g : null
  })
  const [floorPick, setFloorPick] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [touched, setTouched] = useState(false)

  const mode = business.booking_mode
  const asCustomer = !!user && mode !== "guest"
  const ev = detail.data
  // the branch may allow only accounts, or this event may (customers without an account cannot buy its tables)
  const needsLogin =
    !user && (mode === "account" || ev?.accept_guests === false)
  // only the areas the event is held in (the others are booked the normal way); an event with no areas shows them all
  const heldIn = new Set((ev?.areas ?? []).map((a) => a.id))
  const areas = (plans.data ?? []).filter(
    (a) => heldIn.size === 0 || heldIn.has(a.id),
  )

  const sale = useMemo(
    () => new Map((ev?.tables ?? []).map((x) => [x.id, x])),
    [ev],
  )
  const prices = useMemo(
    () =>
      [
        ...new Set(
          (ev?.tables ?? []).filter((x) => x.price > 0).map((x) => x.price),
        ),
      ].sort((a, b) => a - b),
    [ev],
  )
  const free = useMemo(
    () =>
      new Set(
        (ev?.tables ?? [])
          .filter((x) => !x.sold && x.price > 0)
          .map((x) => x.id),
      ),
    [ev],
  )
  const tables = areas.flatMap((a) => a.tables)
  // only tables that are still for sale count (someone may have bought one meanwhile)
  const picked = tables.filter((x) => chosen.includes(x.id) && free.has(x.id))
  const total = picked.reduce((n, x) => n + (sale.get(x.id)?.price ?? 0), 0)
  const seats = picked.reduce((n, x) => n + x.seats, 0)
  // the door list holds as many people as the tables seat (extra chairs count)
  const capacity = picked.reduce(
    (n, x) => n + x.seats + (x.extra_chairs ?? 0),
    0,
  )
  const guests = Math.min(
    Math.max(guestsPick ?? seats, 1),
    Math.max(capacity, 1),
  )
  const currency = ev?.currency ?? "LAK"
  const step: "tables" | "confirm" =
    wantsConfirm && picked.length > 0 ? "confirm" : "tables"

  const floors = [...new Set(areas.map((a) => a.floor))]
  const freeOn = (f: number) =>
    areas
      .filter((a) => a.floor === f)
      .reduce((n, a) => n + a.tables.filter((x) => free.has(x.id)).length, 0)
  const chosenArea = areas.find((a) =>
    a.tables.some((x) => chosen.includes(x.id)),
  )
  const floor =
    chosenArea?.floor ??
    (floorPick !== null && floors.includes(floorPick)
      ? floorPick
      : [...floors].sort((a, b) => freeOn(b) - freeOn(a))[0])

  const toggle = (tid: number) =>
    setChosen(
      chosen.includes(tid) ? chosen.filter((x) => x !== tid) : [...chosen, tid],
    )
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" })
  const next = () => {
    change({ date: ev?.date, step: "confirm" }, true)
    toTop()
  }
  const back = () => {
    change({ step: undefined })
    toTop()
  }

  const details = asCustomer || (name.trim() !== "" && phone.trim().length >= 6)
  // the team must be able to call the customer: an account buys event tables only with a phone number saved
  const needsPhone = asCustomer && !needsLogin && !user?.phone
  const canBuy =
    picked.length > 0 && guests >= 1 && details && !needsLogin && !needsPhone
  const taken =
    buy.error instanceof ApiError && buy.error.code === "TABLE_NOT_AVAILABLE"

  const submit = () => {
    if (!ev) return
    if (!canBuy) {
      setTouched(true)
      return
    }
    buy.mutate(
      {
        date: ev.date,
        table_ids: picked.map((x) => x.id),
        guests,
        ...(asCustomer
          ? {}
          : {
              guest: {
                name: name.trim(),
                phone: phone.trim(),
                ...(email.trim() ? { email: email.trim() } : {}),
              },
            }),
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: (booking) => {
          if (booking.pay)
            rememberPay(slug, booking.id, {
              pay: booking.pay,
              event: ev.name,
              tables: picked.map((x) => x.name).join(", "),
            })
          navigate(`/b/${slug}/confirmed`, {
            replace: true,
            state: { booking },
          })
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === "TABLE_NOT_AVAILABLE") {
            setChosen([])
            void detail.refetch()
          }
        },
      },
    )
  }

  const input = "h-12 text-base lg:h-10 lg:text-sm"
  // where the tables are: "Indoor · Ground floor · VIP"
  const where = areas
    .filter((a) => a.tables.some((x) => picked.some((p) => p.id === x.id)))
    .map((a) => `${a.name} · ${floorName(t, a.floor)}`)
    .join(", ")

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 pt-4 pb-40">
      {step === "confirm" ? (
        <Button variant="ghost" className="-ml-3 h-11" onClick={back}>
          <ArrowLeftIcon />
          {t("public.events.changeTables")}
        </Button>
      ) : (
        <Button asChild variant="ghost" className="-ml-3 h-11">
          <Link to={`/b/${slug}`}>
            <ArrowLeftIcon />
            {t("public.events.back")}
          </Link>
        </Button>
      )}

      {detail.isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : detail.isError || !ev ? (
        <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-border">
          <p>{t("public.events.notFound")}</p>
          <ErrorAlert error={detail.error} />
        </div>
      ) : (
        <>
          <StepBar at={step === "tables" ? 1 : 2} kind="event" />

          <header className="relative overflow-hidden rounded-2xl bg-[var(--brand-hero)] text-[var(--brand-hero-foreground)]">
            {ev.background_url && (
              <img
                src={ev.background_url}
                alt=""
                className="absolute inset-0 size-full object-cover opacity-40"
              />
            )}
            <div className="relative space-y-1 p-6 sm:p-8">
              <p className="text-sm font-medium opacity-90">{eventDays(ev)}</p>
              <h1 className="display-tight text-4xl sm:text-5xl">{ev.name}</h1>
              <EventWhen
                start={ev.start_time}
                end={ev.end_time}
                areas={ev.areas}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm opacity-95"
              />
              {step === "tables" && ev.description && (
                <p className="max-w-prose whitespace-pre-line opacity-90">
                  {ev.description}
                </p>
              )}
            </div>
          </header>

          {step === "tables" && (
            <>
              <EventLineup lineup={ev.lineup} day={ev.date} />
              {ev.days.length > 1 && (
                <section className="space-y-2">
                  <h2 className="font-semibold">{t("public.events.days")}</h2>
                  <div className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4">
                    {ev.days.map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={d === ev.date}
                        onClick={() => change({ date: d, tables: undefined })}
                        className={cn(
                          "h-12 shrink-0 rounded-xl border px-4 text-sm font-semibold",
                          d === ev.date
                            ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
                            : "border-border bg-card",
                        )}
                      >
                        {dayIn(`${d}T12:00:00+00:00`, "UTC")}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {!ev.opens_at ? (
                <p className="rounded-xl bg-card p-4 ring-1 ring-border">
                  {t("public.events.closedThatDay")}
                </p>
              ) : (
                <section className="space-y-3">
                  <div>
                    <h2 className="font-semibold">
                      {t("public.events.pickTables")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("public.events.pickHint")}
                    </p>
                  </div>
                  {plans.isError ? (
                    <ErrorAlert error={plans.error} />
                  ) : !plans.data ? (
                    <Skeleton className="aspect-[5/3] w-full rounded-xl" />
                  ) : (
                    <Plans
                      areas={areas}
                      floors={floors}
                      floor={floor}
                      free={free}
                      chosen={new Set(chosen)}
                      onFloor={(f) => {
                        setFloorPick(f)
                        setChosen([])
                      }}
                      onToggle={toggle}
                      priceLabel={(tid) => {
                        const p = sale.get(tid)?.price ?? 0
                        return p > 0 && free.has(tid) ? compact(p) : undefined
                      }}
                      tint={(tid) => {
                        const p = sale.get(tid)?.price ?? 0
                        const i = prices.indexOf(p)
                        return i < 0
                          ? undefined
                          : PRICE_COLORS[i % PRICE_COLORS.length]
                      }}
                    />
                  )}
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {prices.map((p, i) => (
                      <li key={p} className="flex items-center gap-1.5">
                        <span
                          className="inline-block size-3.5 rounded border-2"
                          style={{
                            borderColor: PRICE_COLORS[i % PRICE_COLORS.length],
                          }}
                        />
                        {money(p, currency)}
                      </li>
                    ))}
                    <li className="flex items-center gap-1.5">
                      <span className="inline-block size-3.5 rounded border-2 border-dashed bg-muted" />
                      {t("public.events.legendSold")}
                    </li>
                    {areas.some((a) =>
                      a.tables.some((x) => x.walk_in_only),
                    ) && (
                      <li className="flex items-center gap-1.5">
                        <span className="inline-block size-3.5 rounded border-2 border-sky-400 bg-sky-50" />
                        {t("public.tables.legendKept")}
                      </li>
                    )}
                  </ul>

                  {/* what is chosen and the total; Continue once something is */}
                  <div className="sticky bottom-24 z-30 space-y-3 rounded-xl bg-card p-4 shadow-lg ring-1 ring-border lg:bottom-4">
                    {picked.length === 0 ? (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <InfoIcon className="size-5 shrink-0" />
                        {t("public.events.tapTable")}
                      </p>
                    ) : (
                      <>
                        <p className="flex items-start gap-2 font-semibold">
                          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                          {t("public.events.summary", {
                            tables: picked.map((x) => x.name).join(" + "),
                            count: seats,
                          })}
                        </p>
                        <p className="flex items-baseline justify-between">
                          <span className="text-muted-foreground">
                            {t("public.events.total")}
                          </span>
                          <span className="display-tight text-3xl text-[var(--brand-ink)]">
                            {money(total, currency)}
                          </span>
                        </p>
                      </>
                    )}
                    <Button
                      size="lg"
                      className="h-12 w-full bg-[var(--brand)] text-base text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
                      disabled={picked.length === 0}
                      onClick={next}
                    >
                      {t("public.continue")}
                    </Button>
                  </div>
                </section>
              )}
            </>
          )}

          {step === "confirm" && (
            <section className="space-y-6">
              <h2 className="display-tight text-4xl">
                {t("public.checkoutTitle")}
              </h2>
              <div className="space-y-2 rounded-xl bg-card p-4 ring-1 ring-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="display-tight text-2xl">
                      {picked.map((x) => x.name).join(" + ")}
                    </p>
                    {where && (
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <MapPinIcon className="size-4 shrink-0" />
                        {where}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {ev.name} · {dayIn(`${ev.date}T12:00:00+00:00`, "UTC")} ·{" "}
                      {t("public.events.seatsN", { count: seats })}
                    </p>
                  </div>
                  <p className="shrink-0 display-tight text-2xl tabular-nums">
                    {money(total, currency)}
                  </p>
                </div>
                {picked.length > ev.big_booking_tables && (
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {t("public.events.bigNote", {
                      n: ev.big_booking_tables,
                      m: ev.big_hold_minutes,
                    })}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("public.events.guestsLabel")}</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Stepper
                    value={guests}
                    max={capacity}
                    onChange={setGuestsPick}
                    icon={<UsersIcon className="size-5" />}
                    lessLabel={t("public.tables.fewer")}
                    moreLabel={t("public.tables.more")}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("public.events.guestsMax", { count: capacity })}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("public.events.guestsHint")}
                </p>
              </div>

              {needsLogin ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-border">
                  <p className="flex-1">
                    {t(
                      ev?.accept_guests === false
                        ? "public.events.needsLoginEvent"
                        : "public.events.needsLogin",
                    )}
                  </p>
                  <Button asChild>
                    <Link
                      to={`/login?next=${encodeURIComponent(`/b/${slug}/events/${id}?${params.toString()}`)}`}
                    >
                      {t("public.events.logIn")}
                    </Link>
                  </Button>
                </div>
              ) : needsPhone ? (
                <PhoneNeeded />
              ) : asCustomer ? (
                <p className="text-sm text-muted-foreground">
                  {t("public.events.bookingAs", {
                    name: user!.name,
                    email: user!.email,
                  })}
                </p>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold">
                    {t("public.events.yourDetails")}
                  </h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-name">{t("fields.name")}</Label>
                    <Input
                      id="ev-name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      aria-invalid={touched && name.trim() === ""}
                      className={input}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-phone">{t("public.phone")}</Label>
                    <Input
                      id="ev-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      aria-invalid={touched && phone.trim().length < 6}
                      className={input}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-email">
                      {t("public.emailOptional")}
                    </Label>
                    <Input
                      id="ev-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={input}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t("public.emailWhy")}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("public.guestLinkNote")}
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="ev-notes">{t("public.notes")}</Label>
                <Textarea
                  id="ev-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-base lg:text-sm"
                />
              </div>

              <p className="text-sm text-muted-foreground">
                {t(`public.events.holdNote.${payWay}`)}
              </p>
              {touched && !details && (
                <p className="text-sm text-destructive">
                  {t("public.events.detailsNeeded")}
                </p>
              )}
              {taken ? (
                <div className="space-y-3">
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
                    {t("public.events.taken")}
                  </p>
                  <Button
                    variant="outline"
                    className="h-11 w-full"
                    onClick={back}
                  >
                    {t("public.pickAnother")}
                  </Button>
                </div>
              ) : (
                <ErrorAlert error={buy.error} />
              )}

              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 w-full text-base"
                  onClick={back}
                >
                  <ArrowLeftIcon />
                  {t("public.events.changeTables")}
                </Button>
                {/* hold, not tap: a booking is only made on purpose */}
                <HoldButton
                  className="w-full"
                  backgroundColor="var(--brand-soft)"
                  textColor="var(--brand-ink)"
                  fillColor="var(--brand)"
                  fillTextColor="var(--brand-foreground)"
                  radius={10}
                  holdTime={HOLD_MS}
                  resetAfter={600}
                  disabled={buy.isPending || needsLogin || needsPhone}
                  doneLabel={t("public.confirming")}
                  hint={t("public.confirmHint", { seconds: HOLD_MS / 1000 })}
                  onHold={submit}
                >
                  {t("public.holdToConfirm")}
                </HoldButton>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
