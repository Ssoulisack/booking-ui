import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BanknoteIcon,
  CheckCircle2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  SmartphoneIcon,
} from "lucide-react"
import QRCode from "qrcode"
import { useEffect, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { ErrorAlert } from "@/components/form"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { Booking, OnlinePayment, PaymentOption } from "@/lib/api/types"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"

import { bookingApi, payApi, publicKeys, usePaymentOptions } from "./api"
import { saveImage } from "./save-image"
import { StartOverDialog } from "./StartOverDialog"

type Who = { token: string } | { bookingId: number }

/** Whether a booking can be paid online now: something to pay, not paid, not cancelled */
export function payableOnline(b: Booking) {
  return (
    b.total_price > 0 &&
    b.payment_status === "unpaid" &&
    // a customer who sent a slip does not pay a second way: the team checks the slip
    !b.slip_sent_at &&
    (b.status === "pending" || b.status === "confirmed")
  )
}

/**
 * Pay a booking online: pick a bank (or the payment page), scan the QR or open the bank app, and the
 * page waits until the gateway says it is paid. Shows nothing when the branch has no online payment.
 * The booking confirms itself: no slip and no staff step.
 */
export function PayOnline({
  slug,
  booking,
  guestToken,
  startOverUrl,
  onPaid,
}: {
  slug: string
  booking: Booking
  guestToken?: string
  /**
   * An event booking: once a QR is made the way to pay is final, so a customer who chose the wrong bank cancels
   * this unpaid booking and goes here to book the same tables again
   */
  startOverUrl?: string
  onPaid?: () => void
}) {
  const { t } = useTranslation()
  const options = usePaymentOptions(slug)
  const who: Who = guestToken
    ? { token: guestToken }
    : { bookingId: booking.id }
  const queryClient = useQueryClient()
  const [payment, setPayment] = useState<OnlinePayment | null>(null)
  // someone who left the page and came back carries on with the payment that is still open (same QR)
  const [released, setReleased] = useState(false)
  // the bank tapped, waiting for "yes": the way to pay is final once its QR is made
  const [pick, setPick] = useState<{ provider: string; method: string } | null>(
    null,
  )
  const resume = useQuery({
    queryKey: ["public", slug, "open-payment", guestToken ?? booking.id],
    queryFn: () => payApi.open(slug, who),
    enabled: payableOnline(booking),
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
  const started = payment ?? (released ? null : (resume.data ?? null))

  const start = useMutation({
    mutationFn: (p: { provider: string; method: string }) =>
      payApi.start(slug, who, p),
    onSuccess: setPayment,
  })

  const navigate = useNavigate()
  const startOver = useMutation({
    mutationFn: () =>
      "token" in who
        ? bookingApi.cancelGuest(
            slug,
            who.token,
            "Customer started over (wrong bank)",
          )
        : bookingApi.cancelMine(
            who.bookingId,
            "Customer started over (wrong bank)",
          ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["public", slug] })
      void queryClient.invalidateQueries({ queryKey: publicKeys.myBookings })
      if (startOverUrl) void navigate(startOverUrl)
    },
  })

  // the page does not wait for the webhook: it asks every few seconds while the payment is open
  const check = useQuery({
    queryKey: ["public", slug, "payment", started?.id],
    queryFn: () => payApi.check(slug, who, started!.id),
    enabled: !!started && started.status === "pending",
    refetchInterval: 3000,
  })
  const current = check.data ?? started
  const paid = current?.status === "paid"

  useEffect(() => {
    if (!paid) return
    if (guestToken)
      void queryClient.invalidateQueries({
        queryKey: publicKeys.guestBooking(slug, guestToken),
      })
    void queryClient.invalidateQueries({ queryKey: publicKeys.myBookings })
    // the confirmation page's live copy of the booking: it is confirmed now
    void queryClient.invalidateQueries({
      queryKey: ["public", slug, "live-booking"],
    })
    onPaid?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid])

  // the booking's hold (the last QR's countdown, or the event's own) has passed: it is being cancelled
  const holdOver = !!booking.pay_by && Date.parse(booking.pay_by) <= Date.now()

  if (!options.data?.length) return null
  if (paid)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 font-medium text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-200">
        <CheckCircle2Icon className="size-5 shrink-0" />
        {t("payOnline.paid")}
      </p>
    )

  return (
    <section className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-border">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BanknoteIcon className="size-5" />
          {t("payOnline.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("payOnline.lead", {
            total: money(booking.total_price, booking.currency),
          })}
        </p>
      </div>

      {current && current.status === "pending" ? (
        <Charge
          payment={current}
          final={!!booking.pay_by}
          startOver={
            startOverUrl ? (
              <StartOverDialog
                pending={startOver.isPending}
                error={startOver.error}
                onConfirm={() => startOver.mutate()}
              />
            ) : null
          }
          bankName={
            options.data
              .flatMap((o) => o.methods)
              .find((m) => m.key === current.method)?.label
          }
          onChange={() => {
            setPayment(null)
            setReleased(true)
            start.reset()
          }}
        />
      ) : resume.isPending && !payment && !released ? (
        // still asking whether a payment is open: do not flash the bank list before the QR comes back
        <Skeleton className="h-40 rounded-lg" />
      ) : (
        <>
          {current && <Ended payment={current} />}
          {holdOver ? (
            // the booking is held only until its countdown ends: it is being cancelled, a new QR is refused
            <p className="rounded-lg bg-amber-50 p-3 text-center text-sm font-medium text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
              {t("payOnline.timeUpFinal")}
            </p>
          ) : (
            <>
              {start.isPending ? (
                // asking the gateway for the QR takes a few seconds: say so, in the chosen bank's look
                <Preparing
                  method={start.variables?.method ?? ""}
                  options={options.data}
                />
              ) : (
                <Methods
                  options={options.data}
                  pending={false}
                  onPick={(provider, method) => setPick({ provider, method })}
                />
              )}
              <ErrorAlert error={start.error} />
            </>
          )}
        </>
      )}
      <ConfirmBank
        method={pick?.method ?? null}
        options={options.data}
        onCancel={() => setPick(null)}
        onConfirm={() => {
          if (pick) start.mutate(pick)
          setPick(null)
        }}
      />
    </section>
  )
}

/** Banks with a logo in public/banks (all seven banks) */
const LOGOS = new Set(["apb", "bcel", "ib", "jdb", "ldb", "m-money", "stb"])

/** Each bank's colour (from its logo): its button gets a tint of it, so banks are known at a glance */
const BANK_COLORS: Record<string, { light: string; dark: string }> = {
  apb: { light: "#1f7a5c", dark: "#4cc9a0" },
  bcel: { light: "#e30613", dark: "#ff6b73" },
  // Indochina's purple is almost black on the dark theme: a much lighter violet there
  ib: { light: "#540c84", dark: "#c08cf5" },
  jdb: { light: "#0c54e4", dark: "#6ea2ff" },
  ldb: { light: "#0c9ce4", dark: "#5cc3ff" },
  "m-money": { light: "#e43c24", dark: "#ff7d68" },
  stb: { light: "#0903ff", dark: "#8583ff" },
}

/**
 * The bank's colour as a CSS variable `--c` (its light shade; its lighter shade on the dark theme): put the
 * returned class and style on a wrapper, then use var(--c) inside. undefined for a bank with no colour.
 */
function bankTheme(key: string) {
  const c = BANK_COLORS[key]
  if (!c) return undefined
  return {
    className: "[--c:var(--bank-l)] dark:[--c:var(--bank-d)]",
    style: { "--bank-l": c.light, "--bank-d": c.dark } as React.CSSProperties,
  }
}

/** Choose the bank */
function Methods({
  options,
  pending,
  onPick,
}: {
  options: PaymentOption[]
  pending: boolean
  onPick: (provider: string, method: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("payOnline.choose")}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.flatMap((o) =>
          o.methods.map((m) => (
            <Button
              key={`${o.provider}-${m.key}`}
              type="button"
              variant="outline"
              className={cn(
                "h-auto min-h-12 flex-col gap-0.5 py-2 text-center whitespace-normal hover:brightness-95 dark:hover:brightness-110",
                bankTheme(m.key)?.className,
                m.key === "link" && "col-span-2",
              )}
              disabled={pending}
              // a light tint of the bank's colour behind its logo, a border in the colour itself
              style={
                bankTheme(m.key)
                  ? {
                      ...bankTheme(m.key)!.style,
                      borderColor:
                        "color-mix(in srgb, var(--c) 55%, transparent)",
                      backgroundColor:
                        "color-mix(in srgb, var(--c) 10%, var(--card))",
                    }
                  : undefined
              }
              onClick={() => onPick(o.provider, m.key)}
            >
              {pending ? <Spinner /> : null}
              {LOGOS.has(m.key) && (
                <img
                  src={`/banks/${m.key}.png`}
                  alt=""
                  className="h-9 w-auto max-w-[80%] rounded-md bg-white object-contain p-1"
                  loading="lazy"
                />
              )}
              <span
                className={cn(
                  "font-semibold",
                  LOGOS.has(m.key) && "text-xs font-medium",
                )}
              >
                {m.key === "link" ? t("payOnline.otherBank") : m.label}
              </span>
              {m.key === "link" && (
                <span className="text-xs font-normal text-muted-foreground">
                  {t("payOnline.otherBankHint")}
                </span>
              )}
            </Button>
          )),
        )}
      </div>
    </div>
  )
}

/** The open payment: the QR, the bank-app link, the time left, and a way to change bank */
function Charge({
  payment: p,
  bankName,
  final,
  startOver,
  onChange,
}: {
  payment: OnlinePayment
  /** the bank's name as the gateway lists it (BCEL One, JDB…) */
  bankName?: string
  /** the booking is held only as long as this QR lives: when the time is up it is cancelled, no second try */
  final: boolean
  /** "Wrong bank? Start over" (event bookings): the way to pay is final while this QR is open */
  startOver: ReactNode
  /** a booking with no hold: after the QR ran out the customer may choose a bank again */
  onChange: () => void
}) {
  const { t } = useTranslation()
  const [qr, setQr] = useState("")
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    if (p.qr_code)
      void QRCode.toDataURL(p.qr_code, { margin: 1, width: 320 }).then(
        (url) => alive && setQr(url),
      )
    return () => {
      alive = false
    }
  }, [p.qr_code])
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const left = Math.max(Math.floor((Date.parse(p.expires_at) - now) / 1000), 0)
  // our time is up: the QR is taken off the screen, so nobody pays a code for a booking we may have released
  const ended = left === 0
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`

  const theme = bankTheme(p.method)
  const name = p.method === "link" ? t("payOnline.otherBank") : bankName
  return (
    <div className={cn("space-y-4", theme?.className)} style={theme?.style}>
      {/* which bank this payment is for: its logo, name and colour (the customer may have tapped the wrong one) */}
      <div
        className="flex items-center gap-3 rounded-lg border p-3"
        style={
          theme
            ? {
                borderColor: "color-mix(in srgb, var(--c) 55%, transparent)",
                backgroundColor:
                  "color-mix(in srgb, var(--c) 10%, var(--card))",
              }
            : undefined
        }
      >
        {LOGOS.has(p.method) && (
          <img
            src={`/banks/${p.method}.png`}
            alt=""
            className="h-11 w-auto max-w-24 shrink-0 rounded-md bg-white object-contain p-1"
          />
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {t("payOnline.payingWith")}
          </p>
          <p className="truncate text-lg font-semibold">{name ?? p.method}</p>
        </div>
      </div>
      {/* the amount in the bank's colours too: the whole payment looks like that bank */}
      <div
        className="rounded-lg bg-[var(--brand-soft)] p-3 text-center"
        style={
          theme
            ? {
                backgroundColor:
                  "color-mix(in srgb, var(--c) 14%, var(--card))",
                border:
                  "1px solid color-mix(in srgb, var(--c) 45%, transparent)",
              }
            : undefined
        }
      >
        <p className="text-sm text-muted-foreground">{t("payOnline.amount")}</p>
        <p
          className="display-tight text-4xl text-[var(--brand-ink)]"
          // the bank's colour, a little toward the text colour so it reads on light and dark
          style={
            theme
              ? { color: "color-mix(in srgb, var(--c) 78%, var(--foreground))" }
              : undefined
          }
        >
          {money(p.amount, p.currency)}
        </p>
      </div>
      {!ended && qr && (
        <figure className="flex flex-col items-center gap-2">
          <img
            src={qr}
            alt={t("payOnline.scan")}
            className="size-64 rounded-lg border-4 bg-white p-2"
            style={theme ? { borderColor: "var(--c)" } : undefined}
          />
          <figcaption className="text-sm text-muted-foreground">
            {t("payOnline.scan")}
          </figcaption>
        </figure>
      )}
      {!ended && p.qr_code && (
        <div className="space-y-1.5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full text-base"
            onClick={async () => {
              // a bigger picture with a wide margin: easier for a bank app to read from the gallery
              const big = await QRCode.toDataURL(p.qr_code!, {
                margin: 3,
                width: 800,
              })
              if (!(await saveImage(big, `payment-${p.id}.png`)))
                window.open(big, "_blank")
            }}
          >
            <DownloadIcon />
            {t("payOnline.saveQr")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {t("payOnline.saveQrHint")}
          </p>
        </div>
      )}
      <div className={cn("grid gap-2", ended && "hidden")}>
        {p.deeplink && (
          <Button asChild size="lg" className="h-12 text-base">
            <a href={p.deeplink}>
              <SmartphoneIcon />
              {t("payOnline.openApp")}
            </a>
          </Button>
        )}
        {p.redirect_url && (
          <Button asChild size="lg" className="h-12 text-base">
            <a href={p.redirect_url} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              {t("payOnline.openPage")}
            </a>
          </Button>
        )}
      </div>
      {ended ? (
        <p
          className="rounded-lg bg-amber-50 p-3 text-center text-sm font-medium text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"
          aria-live="polite"
        >
          {t(final ? "payOnline.timeUpFinal" : "payOnline.timeUp")}
        </p>
      ) : (
        <p
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
          aria-live="polite"
        >
          <Spinner />
          {t("payOnline.waiting", { time: mmss })}
        </p>
      )}
      {ended && !final ? (
        <Button type="button" className="h-11 w-full" onClick={onChange}>
          {t("payOnline.newQr")}
        </Button>
      ) : (
        !ended && startOver
      )}
    </div>
  )
}

/** "Pay with this bank?": asked before the QR is made, because the way to pay cannot be changed afterwards */
function ConfirmBank({
  method,
  options,
  onCancel,
  onConfirm,
}: {
  method: string | null
  options: PaymentOption[]
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  const link = method === "link"
  const label = options
    .flatMap((o) => o.methods)
    .find((m) => m.key === method)?.label
  const name = link ? t("payOnline.otherBank") : (label ?? method ?? "")
  return (
    <AlertDialog open={method !== null} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {method && LOGOS.has(method) && (
            <img
              src={`/banks/${method}.png`}
              alt=""
              className="mx-auto h-12 w-auto max-w-32 rounded-md bg-white object-contain p-1 ring-1 ring-border"
            />
          )}
          <AlertDialogTitle>
            {t(link ? "payOnline.confirmTitleLink" : "payOnline.confirmTitle", {
              bank: name,
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(link ? "payOnline.confirmLeadLink" : "payOnline.confirmLead")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={onCancel}
          >
            {t("payOnline.confirmBack")}
          </Button>
          <Button type="button" className="h-11" onClick={onConfirm}>
            {t("payOnline.confirmYes")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Shown while the QR of the chosen bank is being made: the bank, a QR-sized placeholder and a spinner */
function Preparing({
  method,
  options,
}: {
  method: string
  options: PaymentOption[]
}) {
  const { t } = useTranslation()
  const label = options
    .flatMap((o) => o.methods)
    .find((m) => m.key === method)?.label
  const name = method === "link" ? t("payOnline.otherBank") : (label ?? method)
  const theme = bankTheme(method)
  return (
    <div
      className={cn("space-y-4", theme?.className)}
      style={theme?.style}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-3 rounded-lg border p-3"
        style={
          theme
            ? {
                borderColor: "color-mix(in srgb, var(--c) 55%, transparent)",
                backgroundColor:
                  "color-mix(in srgb, var(--c) 10%, var(--card))",
              }
            : undefined
        }
      >
        {LOGOS.has(method) && (
          <img
            src={`/banks/${method}.png`}
            alt=""
            className="h-11 w-auto max-w-24 shrink-0 rounded-md bg-white object-contain p-1"
          />
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {t("payOnline.preparingTitle")}
          </p>
          <p className="truncate text-lg font-semibold">{name}</p>
        </div>
      </div>
      <div
        className="mx-auto grid size-64 animate-pulse place-items-center rounded-lg border-4 bg-muted/50"
        style={theme ? { borderColor: "var(--c)" } : undefined}
      >
        <Spinner className="size-9" />
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {t("payOnline.preparing", { bank: name })}
      </p>
    </div>
  )
}

/** A payment that ended without being paid */
function Ended({ payment: p }: { payment: OnlinePayment }) {
  const { t } = useTranslation()
  const key =
    p.status === "expired"
      ? "expired"
      : p.status === "failed"
        ? "failed"
        : "review"
  return (
    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
      {t(`payOnline.ended.${key}`)}
    </p>
  )
}
