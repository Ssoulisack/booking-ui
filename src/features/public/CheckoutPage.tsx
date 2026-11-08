import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { ArrowLeftIcon, MapPinIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router"
import { z } from "zod"

import { ErrorAlert, TextField } from "@/components/global/form"
import HoldButton from "@/components/reactbits/HoldButton"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api/client"
import { floorName, zoneHolds } from "@/lib/floor-plan"
import type { CreateBookingInput } from "@/types/booking"
import { dayIn, duration, money, timeIn, todayIn } from "@/lib/format"
import { coversClassOf, leftLabel, ymdLabel } from "@/lib/packages"
import { useSession } from "@/stores/session"

import {
  publicKeys,
  useAvailability,
  useClassesOn,
  useCoaches,
  useCreateBooking,
  useFloorPlans,
  useMyPackages,
  useResources,
  useTableAvailability,
} from "./api"
import { usePublic } from "./context"
import { dayBrandStyle } from "./day-colors"
import { readSelection, selectionQuery, tableIdsOf } from "./selection"
import { StepBar } from "./TableBookingPanel"

const guestSchema = z.object({
  name: z.string().trim().min(1, "validation.required"),
  phone: z.string().trim().min(6, "validation.phone"),
  email: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || z.email().safeParse(v).success,
      "validation.email",
    ),
  notes: z.string().max(500, "validation.tooLong"),
})
type GuestValues = z.infer<typeof guestSchema>

// how long Confirm is held
const HOLD_MS = 1000

/** /b/:slug/book?… — check the choice, say who is booking, confirm */
export function CheckoutPage() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const tz = business.timezone
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { pathname, search } = useLocation()
  const [params] = useSearchParams()
  const sel = readSelection(params)
  const user = useSession((s) => s.user)
  const create = useCreateBooking(slug)

  // a restaurant books tables for a group: no length, no price
  const isTable = business.type === "restaurant"
  const isClass = !isTable && sel.what === "class"
  const resources = useResources(slug)
  const coaches = useCoaches(slug)
  const classes = useClassesOn(slug, sel.date ?? "")
  const plans = useFloorPlans(slug, isTable)
  const tableAvail = useTableAvailability(
    slug,
    isTable && sel.date && sel.guests
      ? { date: sel.date, guests: sel.guests }
      : null,
  )
  const availability = useAvailability(
    slug,
    !isClass && !isTable && sel.date
      ? {
          date: sel.date,
          resource_id: sel.court,
          coach_id: sel.coach,
          sport_id: sel.sport,
        }
      : null,
  )

  const mode = business.booking_mode
  const asCustomer = !!user && mode !== "guest"
  const needsLogin = !user && mode === "account"
  // a package (course pass) of the customer's may pay a class or a space (a table is free: no pass needed)
  const myPackages = useMyPackages(asCustomer && !isTable)
  const [packageId, setPackageId] = useState<number | null>(null)
  const here = encodeURIComponent(pathname + search)

  const form = useForm<GuestValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: { name: "", phone: "", email: "", notes: "" },
  })
  const { errors } = form.formState

  const back = isTable
    ? `/b/${slug}?${selectionQuery({ ...sel, step: "table" })}#book`
    : isClass
      ? `/b/${slug}?${selectionQuery({ ...sel, start: undefined, cls: undefined })}#book`
      : `/b/${slug}?${selectionQuery({ ...sel, step: "time", withCoach: sel.coach ? 1 : undefined })}#book`
  const tableIds = tableIdsOf(sel)
  const complete = isTable
    ? !!(sel.start && sel.guests && tableIds.length)
    : isClass
      ? !!sel.cls
      : !!(sel.start && sel.length && (sel.court || sel.coach))
  if (!complete) return <Navigate to={`/b/${slug}#book`} replace />

  // --- what is being booked, in words ---
  const cls = classes.data?.find((c) => c.id === sel.cls)
  const court = resources.data?.find((r) => r.id === sel.court)
  const coach = coaches.data?.find((c) => c.id === sel.coach)
  const seats = sel.seats ?? 1
  const tables = (plans.data ?? [])
    .flatMap((a) => a.tables)
    .filter((x) => tableIds.includes(x.id))
  // where the tables are: their area and its floor ("Indoor · Ground floor")
  const where = (plans.data ?? [])
    .filter((a) => a.tables.some((x) => tableIds.includes(x.id)))
    .map((a) => {
      const mine = a.tables.filter((x) => tableIds.includes(x.id))
      // the zones the chosen tables stand in (Smoking, VIP…)
      const zones = a.items
        .filter((z) => z.label && mine.some((x) => zoneHolds(z, x)))
        .map((z) => z.label)
      return [a.name, floorName(t, a.floor), ...new Set(zones)].join(" · ")
    })
    .join(", ")
  const loading = isTable
    ? !plans.data
    : isClass
      ? !classes.data
      : !availability.data || !resources.data
  const title = isTable
    ? tables.map((x) => x.name).join(" + ")
    : isClass
      ? cls?.title
      : [court?.name, coach?.name].filter(Boolean).join(" + ")
  const when = isTable
    ? sel.start &&
      [
        tableAvail.data?.booking_style === "arrive_by"
          ? dayIn(sel.start, tz)
          : `${dayIn(sel.start, tz)}, ${timeIn(sel.start, tz)}`,
        t("public.tables.guestsLine", { count: sel.guests ?? 0 }),
      ]
        .filter(Boolean)
        .join(" · ")
    : isClass
      ? cls &&
        `${dayIn(cls.starts_at, tz)}, ${timeIn(cls.starts_at, tz)}–${timeIn(cls.ends_at, tz)}`
      : sel.start &&
        `${dayIn(sel.start, tz)}, ${timeIn(sel.start, tz)} · ${duration(sel.length!)}`
  const price = isTable
    ? undefined
    : isClass
      ? cls && { amount: cls.price * seats, currency: cls.currency }
      : (() => {
          const p = availability.data?.prices.find(
            (x) => x.duration_min === sel.length,
          )
          return p && availability.data?.currency
            ? { amount: p.price, currency: availability.data.currency }
            : undefined
        })()

  // the customer's packages that fit this booking: this branch, active, a visit left, not out of time on the day,
  // covering this class (one seat) or this space (no coach)
  const bookingDay = isClass
    ? cls && todayIn(tz, new Date(cls.starts_at))
    : sel.date
  const usable = (myPackages.data ?? []).filter((p) => {
    if (p.branch_slug !== slug || p.status !== "active" || !bookingDay)
      return false
    if (p.kind === "times" && p.times_left < 1) return false
    const last = p.kind === "months" ? p.ends_on : p.expires_on
    if (last && bookingDay > last) return false
    return isClass
      ? p.covers === "group_class" &&
          p.sport_id === cls?.sport_id &&
          coversClassOf(p, cls?.timetable_id) &&
          seats === 1
      : p.covers === "space" && p.resource_id === sel.court && !sel.coach
  })
  const usePackage = usable.find((p) => p.id === packageId) ?? null

  const submit = (guest?: GuestValues) => {
    const body: CreateBookingInput = isTable
      ? { table_ids: tableIds, guests: sel.guests, starts_at: sel.start }
      : isClass
        ? { class_session_id: sel.cls, seats }
        : {
            resource_id: sel.court,
            coach_id: sel.coach,
            sport_id: sel.sport,
            starts_at: sel.start,
            duration_min: sel.length,
          }
    if (usePackage) body.package_id = usePackage.id
    if (guest) {
      body.guest = {
        name: guest.name,
        phone: guest.phone,
        ...(guest.email ? { email: guest.email } : {}),
      }
      body.notes = guest.notes || undefined
    }
    create.mutate(body, {
      onSuccess: (booking) => {
        void queryClient.invalidateQueries({ queryKey: ["public", slug] })
        void queryClient.invalidateQueries({ queryKey: publicKeys.myBookings })
        navigate(`/b/${slug}/confirmed`, { replace: true, state: { booking } })
      },
    })
  }

  const taken =
    create.error instanceof ApiError &&
    [
      "SLOT_NOT_AVAILABLE",
      "CLASS_FULL",
      "CLASS_NOT_AVAILABLE",
      "TABLE_NOT_AVAILABLE",
    ].includes(create.error.code)

  // hold, not tap: a booking is only made on purpose (the page still sparks wherever it is touched)
  // Back just above Confirm: changing the choice is one tap away from the last button
  const confirmButton = (onConfirm: () => void) => (
    <div className="space-y-3">
      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-12 w-full text-base"
      >
        <Link to={back}>
          <ArrowLeftIcon />
          {t(isTable ? "public.tables.changeTable" : "public.changeChoice")}
        </Link>
      </Button>
      <HoldButton
        className="w-full"
        backgroundColor="var(--brand-soft)"
        textColor="var(--brand-ink)"
        fillColor="var(--brand)"
        fillTextColor="var(--brand-foreground)"
        radius={10}
        holdTime={HOLD_MS}
        // short: a refused answer (missing details, slot taken) lets them try again at once
        resetAfter={600}
        disabled={create.isPending}
        doneLabel={t("public.confirming")}
        hint={t("public.confirmHint", { seconds: HOLD_MS / 1000 })}
        onHold={onConfirm}
      >
        {t("public.holdToConfirm")}
      </HoldButton>
    </div>
  )

  // the page takes the colour of the booked day (Sunday red, Monday yellow, …): buttons, steps, links
  const dayStyle = dayBrandStyle(sel.date, tz)

  return (
    <main
      className="mx-auto max-w-xl space-y-6 px-4 pt-4 pb-16"
      style={dayStyle}
    >
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link to={back}>
          <ArrowLeftIcon />
          {t(isTable ? "public.tables.changeTable" : "public.changeChoice")}
        </Link>
      </Button>
      {!isClass && (
        <StepBar
          at={!isTable && sel.coach ? 4 : 3}
          kind={isTable ? "table" : sel.coach ? "coachTime" : "time"}
        />
      )}
      <h1 className="display-tight text-4xl">{t("public.checkoutTitle")}</h1>

      <section className="rounded-xl bg-card p-4">
        {loading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="display-tight text-2xl">{title}</p>
              {isTable && where && (
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <MapPinIcon className="size-4 shrink-0" />
                  {where}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{when}</p>
              {isClass && seats > 1 && (
                <p className="text-sm text-muted-foreground">
                  {t("public.seatsCount", { count: seats })}
                </p>
              )}
            </div>
            {price && (
              <p
                className={
                  usePackage
                    ? "shrink-0 display-tight text-2xl text-muted-foreground tabular-nums line-through"
                    : "shrink-0 display-tight text-2xl tabular-nums"
                }
              >
                {money(price.amount, price.currency)}
              </p>
            )}
            {isTable && (
              <p className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {t("public.tables.free")}
              </p>
            )}
          </div>
        )}
      </section>

      {create.error && (
        <div className="space-y-3">
          <ErrorAlert error={create.error} />
          {taken && (
            <Button asChild variant="outline" className="h-11 w-full">
              <Link to={back}>{t("public.pickAnother")}</Link>
            </Button>
          )}
        </div>
      )}

      {needsLogin ? (
        <section className="space-y-3 rounded-xl bg-card p-4">
          <p>{t("public.loginToBook")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild size="lg" className="h-12">
              <Link to={`/login?next=${here}`}>{t("actions.logIn")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12">
              <Link to={`/register?next=${here}`}>{t("register.submit")}</Link>
            </Button>
          </div>
        </section>
      ) : asCustomer ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <p className="text-sm text-muted-foreground">
            {t("public.bookingAs", { name: user!.name, email: user!.email })}
          </p>
          {usable.length > 0 && (
            <fieldset className="space-y-2 rounded-xl bg-card p-4">
              <legend className="px-1 text-sm font-medium">
                {t("packages.checkout.title")}
              </legend>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                <input
                  type="radio"
                  name="use-package"
                  checked={!usePackage}
                  onChange={() => setPackageId(null)}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">
                  {price
                    ? t("packages.checkout.payPrice", {
                        price: money(price.amount, price.currency),
                      })
                    : t("packages.checkout.payNormal")}
                </span>
              </label>
              {usable.map((p) => (
                <label
                  key={p.id}
                  className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary"
                >
                  <input
                    type="radio"
                    name="use-package"
                    checked={usePackage?.id === p.id}
                    onChange={() => setPackageId(p.id)}
                    className="mt-1 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      {t("packages.checkout.useMine", { name: p.name })}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {leftLabel(t, p, ymdLabel)}
                      {p.kind === "times" &&
                        ` · ${t("packages.checkout.usesOne")}`}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <Policy text={business.booking_policy} />
          {confirmButton(() => submit())}
        </form>
      ) : (
        <form
          onSubmit={form.handleSubmit(submit)}
          noValidate
          className="space-y-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{t("public.yourDetails")}</h2>
            {mode === "both" && (
              <Link
                to={`/login?next=${here}`}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground underline underline-offset-4 hover:text-[var(--brand)]"
              >
                {t("public.haveAccount")}
              </Link>
            )}
          </div>
          <FieldGroup>
            <TextField
              label={t("fields.name")}
              autoComplete="name"
              registration={form.register("name")}
              error={errors.name}
            />
            <TextField
              label={t("public.phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              registration={form.register("phone")}
              error={errors.phone}
            />
            <div>
              <TextField
                label={t("public.emailOptional")}
                type="email"
                inputMode="email"
                autoComplete="email"
                registration={form.register("email")}
                error={errors.email}
              />
              <FieldDescription className="mt-1.5">
                {t("public.emailWhy")}
              </FieldDescription>
            </div>
            <Field>
              <FieldLabel htmlFor="notes">{t("public.notes")}</FieldLabel>
              <Textarea
                id="notes"
                rows={2}
                className="text-base lg:text-sm"
                {...form.register("notes")}
              />
            </Field>
          </FieldGroup>
          <p className="text-sm text-muted-foreground">
            {t("public.guestLinkNote")}
          </p>
          <Policy text={business.booking_policy} />
          {confirmButton(() => void form.handleSubmit(submit)())}
        </form>
      )}
    </main>
  )
}

function Policy({ text }: { text: string }) {
  const { t } = useTranslation()
  if (!text) return null
  return (
    <details className="rounded-xl bg-card p-4 text-sm">
      <summary className="min-h-6 cursor-pointer font-medium">
        {t("public.policyTitle")}
      </summary>
      <p className="mt-2 whitespace-pre-line text-muted-foreground">{text}</p>
    </details>
  )
}
