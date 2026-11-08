import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { CheckCircle2Icon, ClockIcon, DownloadIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { Booking } from "@/types/booking"
import type { EventPay } from "@/types/event"
import { dayIn, money, timeIn } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  publicKeys,
  slipApi,
  usePaymentOptions,
  usePublicPayInfo,
  type SlipInput,
} from "./api"
import { eventStartOverUrl } from "./booking-utils"
import { PayOnline } from "./PayOnline"
import { CopyButton } from "@/components/CopyButton"
import { saveImage } from "./save-image"
import { SlipSender } from "./SlipSender"

/** What a buyer needs after buying: remembered on this device, so the booking page can show it again */
interface Remembered {
  pay: EventPay
  event: string
  tables: string
}

const key = (slug: string, bookingId: number) =>
  `event-pay:${slug}:${bookingId}`

export function rememberPay(slug: string, bookingId: number, r: Remembered) {
  try {
    localStorage.setItem(key(slug, bookingId), JSON.stringify(r))
  } catch {
    // private window: the pay panel still shows right after buying
  }
}

export function recallPay(slug: string, bookingId: number): Remembered | null {
  try {
    const raw = localStorage.getItem(key(slug, bookingId))
    return raw ? (JSON.parse(raw) as Remembered) : null
  } catch {
    return null
  }
}

/**
 * The payment step of an event booking: the total, the time left, the branch's QR, a WhatsApp button
 * with the slip message filled in, and "I sent the slip" (the hold then stops running out by itself).
 */
export function EventPayPanel({
  slug,
  tz,
  phone,
  booking,
  guestToken,
  info,
}: {
  slug: string
  tz: string
  /** the branch phone, when this device does not remember how to pay */
  phone: string
  booking: Booking
  guestToken?: string
  info: Remembered | null
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [paidOnline, setPaidOnline] = useState(false)
  // when the branch takes online payment it is the first choice
  const [method, setMethod] = useState<"online" | "manual">("online")
  const hasOnline = !!usePaymentOptions(slug).data?.length
  // every hook stays above the early returns below: the panel turns into "Paid" while it is on screen, and a
  // hook that is skipped on the next render crashes the page
  const remote = usePublicPayInfo(slug)
  const slip = useMutation({
    mutationFn: (input: SlipInput) =>
      guestToken
        ? slipApi.guest(slug, guestToken, input)
        : slipApi.mine(booking.id, input),
    onSuccess: (updated) => {
      if (guestToken)
        queryClient.setQueryData(
          publicKeys.guestBooking(slug, guestToken),
          updated,
        )
      void queryClient.invalidateQueries({ queryKey: publicKeys.myBookings })
      void queryClient.invalidateQueries({
        queryKey: ["public", slug, "live-booking"],
      })
      toast.success(t("public.events.pay.slipDone"))
    },
  })

  if (booking.status === "cancelled")
    return (
      <p className="rounded-xl bg-card p-4 ring-1 ring-border">
        {t("public.events.pay.cancelled")}
      </p>
    )
  if (booking.payment_status === "paid" || paidOnline)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 font-medium text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-200">
        <CheckCircle2Icon className="size-5 shrink-0" />
        {t("public.events.pay.paid")}
      </p>
    )

  // how to pay the branch is read from the branch every time (above): what this device remembered from the
  // purchase may be old (the admin may have turned a way off or changed the account since)
  const pay: EventPay | undefined = remote.data
    ? {
        total: booking.total_price,
        currency: booking.currency,
        hold_until: booking.pay_by,
        big_booking: info?.pay.big_booking ?? false,
        ...remote.data,
      }
    : info?.pay
  const total = pay?.total ?? booking.total_price
  const currency = pay?.currency ?? booking.currency
  const holdUntil = booking.pay_by ?? pay?.hold_until
  const slipSent = !!(booking.slip_sent_at ?? slip.data?.slip_sent_at)
  const whatsapp = (pay?.whatsapp ?? "").replace(/[^\d]/g, "")
  // the admin can turn the branch's own way to pay off (this device may not know: then it is shown)
  const transferOn = pay?.transfer_enabled ?? true
  const shownMethod = !hasOnline ? "manual" : !transferOn ? "online" : method
  const message = t("public.events.pay.message", {
    code: booking.code,
    event: info?.event ?? "",
    tables: info?.tables ?? "",
    total: money(total, currency),
  })

  return (
    <section className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-border">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          {t("public.events.pay.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {/* only the ways this branch really takes: no "send the slip" when it takes no slips */}
          {t(
            `public.events.pay.lead.${hasOnline ? (transferOn ? "both" : "online") : transferOn ? "slip" : "team"}`,
          )}
        </p>
      </div>
      <div className="rounded-lg bg-[var(--brand-soft)] p-3 text-center">
        <p className="text-sm text-muted-foreground">
          {t("public.events.pay.total")}
        </p>
        <p className="display-tight text-4xl text-[var(--brand-ink)]">
          {money(total, currency)}
        </p>
      </div>
      {/* the clock: until when the tables are held, and what happens when it runs out */}
      {holdUntil && (
        <HoldClock
          until={holdUntil}
          tz={tz}
          slipSent={slipSent}
          slipSentAt={booking.slip_sent_at ?? slip.data?.slip_sent_at}
          big={!!pay?.big_booking}
        />
      )}
      {/* step 3: choose how to pay. Online (a bank app QR) confirms by itself; the branch's own QR or a
          transfer is checked by the team, who are told on WhatsApp. */}
      {!slipSent && hasOnline && transferOn && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            {t("public.events.pay.method")}
          </legend>
          {(["online", "manual"] as const).map((m) => (
            <label
              key={m}
              className="flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary"
            >
              <input
                type="radio"
                name="pay-method"
                checked={method === m}
                onChange={() => setMethod(m)}
                className="mt-1 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">
                  {t(`public.events.pay.methods.${m}`)}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {t(`public.events.pay.methodHints.${m}`)}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {!slipSent && hasOnline && shownMethod === "online" && (
        <PayOnline
          slug={slug}
          booking={booking}
          guestToken={guestToken}
          startOverUrl={eventStartOverUrl(slug, booking, tz)}
          onPaid={() => setPaidOnline(true)}
        />
      )}
      {!slipSent && !hasOnline && !transferOn && (
        // both ways are off: the customer cannot pay here; the team confirms by hand
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
          {t("public.events.pay.noWay", { phone })}
        </p>
      )}
      {transferOn && (shownMethod === "manual" || slipSent) && (
        <>
          {slipSent ? null : pay ? (
            <>
              {pay?.qr_url && (
                <figure className="flex flex-col items-center gap-2">
                  <img
                    src={pay.qr_url}
                    alt={t("public.events.pay.scan")}
                    className="max-h-72 rounded-lg bg-white p-2"
                  />
                  <figcaption className="text-sm text-muted-foreground">
                    {t("public.events.pay.scan")}
                  </figcaption>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={async () => {
                      if (
                        !(await saveImage(
                          pay.qr_url!,
                          `pay-${booking.code}.png`,
                        ))
                      )
                        window.open(pay.qr_url, "_blank")
                    }}
                  >
                    <DownloadIcon />
                    {t("payOnline.saveQr")}
                  </Button>
                </figure>
              )}
              {(pay?.account_name || pay?.account_number || pay?.note) && (
                <dl className="space-y-3 rounded-lg bg-muted/50 p-3 text-sm">
                  {pay?.account_name && (
                    <AccountRow
                      label={t("public.events.pay.accountName")}
                      value={pay.account_name}
                    />
                  )}
                  {pay?.account_number && (
                    <AccountRow
                      label={t("public.events.pay.accountNumber")}
                      value={pay.account_number}
                      big
                    />
                  )}
                  {pay?.note && (
                    <AccountRow
                      label={t("public.events.pay.accountNote")}
                      value={pay.note}
                      multiline
                    />
                  )}
                </dl>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("public.events.pay.noInfo", { phone })}
            </p>
          )}
          {/* paid outside the system: the customer sends the slip. The branch chooses the way: the picture uploaded
              here (the team gets it in their group), WhatsApp with the message filled in, or both. Either way the
              system learns a slip was sent: the hold stops running out and the team sees "slip sent". */}
          <SlipSender
            telegram={remote.data?.slip_telegram ?? false}
            whatsappNumber={
              remote.data?.slip_whatsapp === false ? "" : whatsapp
            }
            message={message}
            sentAt={booking.slip_sent_at ?? slip.data?.slip_sent_at}
            sentVia={booking.slip_via ?? slip.data?.slip_via}
            pending={slip.isPending}
            error={slip.error}
            markOnly
            onSend={(input) => slip.mutateAsync(input)}
          />
        </>
      )}
    </section>
  )
}

/** One line of the branch's account (its name, number or extra text) with a copy button */
export function AccountRow({
  label,
  value,
  big,
  multiline,
}: {
  label: string
  value: string
  big?: boolean
  multiline?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd
          className={
            big
              ? "text-lg font-semibold tracking-wide tabular-nums"
              : multiline
                ? "whitespace-pre-line"
                : "font-medium"
          }
        >
          {value}
        </dd>
      </div>
      <CopyButton
        text={value}
        label={t("public.events.pay.copy", { what: label })}
        doneLabel={t("public.events.pay.copied")}
      />
    </div>
  )
}

/** Format a number of seconds as "1 d 3 h", "2 h 05 min" or "04:59" */
function left(seconds: number) {
  const s = Math.max(seconds, 0)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, "0")
  if (d > 0) return `${d} d ${h} h`
  if (h > 0) return `${h} h ${pad(m)} min`
  return `${pad(m)}:${pad(s % 60)}`
}

/**
 * How long the tables are held, counting down, and the plain warning that the booking cancels itself when
 * the time is up (unless the customer has sent the slip: then the team decides). Amber in the last 15 minutes.
 */
export function HoldClock({
  until,
  tz,
  slipSent,
  slipSentAt,
  big,
  compact,
}: {
  until: string
  tz: string
  slipSent: boolean
  /** when the slip was sent, to say so */
  slipSentAt?: string
  big: boolean
  /** smaller, for a booking card in the list */
  compact?: boolean
}) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const seconds = Math.floor((Date.parse(until) - now) / 1000)
  const when = `${dayIn(until, tz)}, ${timeIn(until, tz)}`

  if (slipSent)
    return (
      // soft tint of the theme's button yellow, normal text
      <p className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-sm font-medium text-foreground ring-1 ring-primary/30">
        <ClockIcon className="mt-0.5 size-4 shrink-0" />
        {slipSentAt
          ? t("public.events.pay.heldWhileCheckingAt", {
              when: `${dayIn(slipSentAt, tz)}, ${timeIn(slipSentAt, tz)}`,
            })
          : t("public.events.pay.heldWhileChecking")}
      </p>
    )
  const urgent = seconds <= 15 * 60
  return (
    <div
      className={cn(
        // a soft tint of the button's yellow on the theme background; stronger in the last 15 minutes
        "space-y-1 rounded-lg bg-primary/10 p-3 text-foreground ring-1",
        urgent ? "bg-primary/20 ring-2 ring-primary" : "ring-primary/30",
      )}
      role="timer"
      aria-live="off"
    >
      <p className="flex items-center gap-2 text-sm font-medium">
        <ClockIcon className="size-4 shrink-0" />
        {t("public.events.pay.timeLeft")}
      </p>
      <p
        className={cn(
          // the number in the readable shade of the button colour (dark amber on light, pale amber on dark)
          "display-tight text-[var(--primary-ink)] tabular-nums",
          compact ? "text-2xl" : "text-3xl",
        )}
      >
        {seconds > 0 ? left(seconds) : t("public.events.pay.timeUp")}
      </p>
      <p className="text-sm text-muted-foreground">
        {seconds > 0
          ? t("public.events.pay.cancelWarning", { when })
          : t("public.events.pay.releasing")}
        {big &&
          seconds > 0 &&
          ` ${t("public.events.pay.bigHold", { when: timeIn(until, tz) })}`}
      </p>
    </div>
  )
}
