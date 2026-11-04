import { ArrowLeftIcon, CheckCircle2Icon, InfoIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api/client"
import { dayIn, money } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSession } from "@/stores/session"

import { useBuyEventTables, useEventDetail, useFloorPlans } from "./api"
import { usePublic } from "./context"
import { eventDays } from "./EventAds"
import { rememberPay } from "./EventPay"
import { Plans } from "./TableBookingPanel"

/** Tables of one price share a colour; the cheapest first */
const PRICE_COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#64748b",
]

/** 1500000 → "1.5M", 250000 → "250k" */
function compact(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}k`
  return String(n)
}

/** /b/:slug/events/:eventId — an event day: pick tables at their prices, buy, then pay */
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

  const [chosen, setChosen] = useState<number[]>([])
  const [guestsText, setGuestsText] = useState<string | null>(null)
  const [floorPick, setFloorPick] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")

  const mode = business.booking_mode
  const asCustomer = !!user && mode !== "guest"
  const needsLogin = !user && mode === "account"
  const ev = detail.data
  const areas = plans.data ?? []

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
  const picked = tables.filter((x) => chosen.includes(x.id))
  const total = picked.reduce((n, x) => n + (sale.get(x.id)?.price ?? 0), 0)
  const seats = picked.reduce((n, x) => n + x.seats, 0)
  const guests = guestsText === null ? seats : Number(guestsText) || 0

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
    setChosen((c) =>
      c.includes(tid) ? c.filter((x) => x !== tid) : [...c, tid],
    )
  const tz = business.timezone
  const currency = ev?.currency ?? "LAK"
  const details = asCustomer || (name.trim() !== "" && phone.trim().length >= 6)
  const canBuy = picked.length > 0 && guests >= 1 && details && !needsLogin

  const taken =
    buy.error instanceof ApiError && buy.error.code === "TABLE_NOT_AVAILABLE"

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ev || !canBuy) return
    buy.mutate(
      {
        date: ev.date,
        table_ids: chosen,
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

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 pt-4 pb-40">
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link to={`/b/${slug}`}>
          <ArrowLeftIcon />
          {t("public.events.back")}
        </Link>
      </Button>

      {detail.isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : detail.isError || !ev ? (
        <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-border">
          <p>{t("public.events.notFound")}</p>
          <ErrorAlert error={detail.error} />
        </div>
      ) : (
        <>
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
              {ev.description && (
                <p className="max-w-prose whitespace-pre-line opacity-90">
                  {ev.description}
                </p>
              )}
            </div>
          </header>

          {ev.days.length > 1 && (
            <section className="space-y-2">
              <h2 className="font-semibold">{t("public.events.days")}</h2>
              <div className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4">
                {ev.days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={d === ev.date}
                    onClick={() => {
                      setChosen([])
                      setParams({ date: d }, { replace: true })
                    }}
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
              </ul>
            </section>
          )}

          {ev.opens_at && (
            <form onSubmit={submit} noValidate className="space-y-5">
              <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-border">
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
                    <p className="flex items-baseline justify-between border-t pt-3">
                      <span className="text-muted-foreground">
                        {t("public.events.total")}
                      </span>
                      <span className="display-tight text-3xl text-[var(--brand-ink)]">
                        {money(total, currency)}
                      </span>
                    </p>
                    {picked.length > ev.big_booking_tables && (
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        {t("public.events.bigNote", {
                          n: ev.big_booking_tables,
                          m: ev.big_hold_minutes,
                        })}
                      </p>
                    )}
                  </>
                )}
              </section>

              {picked.length > 0 && (
                <section className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-guests">
                      {t("public.events.guestsLabel")}
                    </Label>
                    <Input
                      id="ev-guests"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={guestsText ?? String(seats)}
                      onChange={(e) => setGuestsText(e.target.value)}
                      className={`${input} w-32`}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t("public.events.guestsHint")}
                    </p>
                  </div>

                  {needsLogin ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-border">
                      <p className="flex-1">{t("public.events.needsLogin")}</p>
                      <Button asChild>
                        <Link
                          to={`/login?next=${encodeURIComponent(`/b/${slug}/events/${id}`)}`}
                        >
                          {t("public.events.logIn")}
                        </Link>
                      </Button>
                    </div>
                  ) : asCustomer ? (
                    <p className="text-sm text-muted-foreground">
                      {t("public.events.bookingAs", {
                        name: user!.name,
                        email: user!.email,
                      })}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <h2 className="font-semibold">
                        {t("public.events.yourDetails")}
                      </h2>
                      <div className="space-y-1.5">
                        <Label htmlFor="ev-name">{t("fields.name")}</Label>
                        <Input
                          id="ev-name"
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
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
                      </div>
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
                    {t("public.events.holdNote")}
                  </p>
                  {taken ? (
                    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
                      {t("public.events.taken")}
                    </p>
                  ) : (
                    <ErrorAlert error={buy.error} />
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full bg-[var(--brand)] text-base text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
                    disabled={!canBuy || buy.isPending}
                  >
                    {buy.isPending
                      ? t("public.events.buying")
                      : `${t("public.events.buy")} · ${money(total, currency)}`}
                  </Button>
                </section>
              )}
            </form>
          )}
        </>
      )}
      <span className="sr-only" aria-live="polite">
        {tz}
      </span>
    </main>
  )
}
