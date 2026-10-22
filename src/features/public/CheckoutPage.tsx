import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeftIcon } from "lucide-react"
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

import { ErrorAlert, TextField } from "@/components/form"
import ClickSpark from "@/components/reactbits/ClickSpark"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api/client"
import type { CreateBookingInput } from "@/lib/api/types"
import { dayIn, duration, money, timeIn } from "@/lib/format"
import { useSession } from "@/stores/session"

import {
  publicKeys,
  useAvailability,
  useClassesOn,
  useCoaches,
  useCreateBooking,
  useResources,
} from "./api"
import { DEFAULT_BRAND } from "./brand"
import { usePublic } from "./context"
import { readSelection, selectionQuery } from "./selection"

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

  const isClass = sel.what === "class"
  const resources = useResources(slug)
  const coaches = useCoaches(slug)
  const classes = useClassesOn(slug, sel.date ?? "")
  const availability = useAvailability(
    slug,
    !isClass && sel.date
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
  const here = encodeURIComponent(pathname + search)

  const form = useForm<GuestValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: { name: "", phone: "", email: "", notes: "" },
  })
  const { errors } = form.formState

  const back = `/b/${slug}?${selectionQuery({ ...sel, start: undefined, cls: undefined })}#book`
  const complete = isClass
    ? !!sel.cls
    : !!(sel.start && sel.length && (sel.court || sel.coach))
  if (!complete) return <Navigate to={`/b/${slug}#book`} replace />

  // --- what is being booked, in words ---
  const cls = classes.data?.find((c) => c.id === sel.cls)
  const court = resources.data?.find((r) => r.id === sel.court)
  const coach = coaches.data?.find((c) => c.id === sel.coach)
  const seats = sel.seats ?? 1
  const loading = isClass
    ? !classes.data
    : !availability.data || !resources.data
  const title = isClass
    ? cls?.title
    : [court?.name, coach?.name].filter(Boolean).join(" + ")
  const when = isClass
    ? cls &&
      `${dayIn(cls.starts_at, tz)}, ${timeIn(cls.starts_at, tz)}–${timeIn(cls.ends_at, tz)}`
    : sel.start &&
      `${dayIn(sel.start, tz)}, ${timeIn(sel.start, tz)} · ${duration(sel.length!)}`
  const price = isClass
    ? cls && { amount: cls.price * seats, currency: cls.currency }
    : (() => {
        const p = availability.data?.prices.find(
          (x) => x.duration_min === sel.length,
        )
        return p && availability.data?.currency
          ? { amount: p.price, currency: availability.data.currency }
          : undefined
      })()

  const submit = (guest?: GuestValues) => {
    const body: CreateBookingInput = isClass
      ? { class_session_id: sel.cls, seats }
      : {
          resource_id: sel.court,
          coach_id: sel.coach,
          sport_id: sel.sport,
          starts_at: sel.start,
          duration_min: sel.length,
        }
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
    ["SLOT_NOT_AVAILABLE", "CLASS_FULL", "CLASS_NOT_AVAILABLE"].includes(
      create.error.code,
    )

  const confirmButton = (
    <ClickSpark
      sparkColor={business.brand_color || DEFAULT_BRAND}
      sparkCount={12}
      sparkRadius={28}
    >
      <Button
        type="submit"
        size="lg"
        className="h-12 w-full text-base"
        disabled={create.isPending}
      >
        {create.isPending && <Spinner />}
        {t("public.confirm")}
      </Button>
    </ClickSpark>
  )

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 pt-4 pb-16">
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link to={back}>
          <ArrowLeftIcon />
          {t("public.changeChoice")}
        </Link>
      </Button>
      <h1 className="text-4xl display-tight">{t("public.checkoutTitle")}</h1>

      <section className="rounded-xl bg-white p-4">
        {loading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-2xl display-tight">{title}</p>
              <p className="text-sm text-muted-foreground">{when}</p>
              {isClass && seats > 1 && (
                <p className="text-sm text-muted-foreground">
                  {t("public.seatsCount", { count: seats })}
                </p>
              )}
            </div>
            {price && (
              <p className="shrink-0 text-2xl display-tight tabular-nums">
                {money(price.amount, price.currency)}
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
        <section className="space-y-3 rounded-xl bg-white p-4">
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
          <Policy text={business.booking_policy} />
          {confirmButton}
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
                className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--brand-ink)] underline-offset-4 hover:underline"
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
            <TextField
              label={t("public.emailOptional")}
              type="email"
              inputMode="email"
              autoComplete="email"
              registration={form.register("email")}
              error={errors.email}
            />
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
          {confirmButton}
        </form>
      )}
    </main>
  )
}

function Policy({ text }: { text: string }) {
  const { t } = useTranslation()
  if (!text) return null
  return (
    <details className="rounded-xl bg-white p-4 text-sm">
      <summary className="min-h-6 cursor-pointer font-medium">
        {t("public.policyTitle")}
      </summary>
      <p className="mt-2 whitespace-pre-line text-muted-foreground">{text}</p>
    </details>
  )
}
