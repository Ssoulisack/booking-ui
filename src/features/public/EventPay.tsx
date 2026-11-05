import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  MessageCircleIcon,
  SendIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import type { Booking, EventPay } from "@/lib/api/types"
import { dayIn, money, timeIn } from "@/lib/format"

import { publicKeys, slipApi, usePaymentOptions, usePublicPayInfo } from "./api"
import { PayOnline } from "./PayOnline"
import { CopyButton } from "@/components/CopyButton"
import { saveImage } from "./save-image"

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
    mutationFn: () =>
      guestToken ? slipApi.guest(slug, guestToken) : slipApi.mine(booking.id),
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
  const holdUntil = pay?.hold_until ?? booking.pay_by
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
          {t("public.events.pay.lead")}
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
      {holdUntil && !slipSent && (
        <p className="flex items-start gap-2 text-sm font-medium">
          <ClockIcon className="mt-0.5 size-4 shrink-0" />
          {t("public.events.pay.before", {
            when: `${dayIn(holdUntil, tz)}, ${timeIn(holdUntil, tz)}`,
          })}
          {pay?.big_booking && (
            <span className="font-normal text-muted-foreground">
              {" "}
              ·{" "}
              {t("public.events.pay.bigHold", {
                when: timeIn(holdUntil, tz),
              })}
            </span>
          )}
        </p>
      )}
      {/* step 3: choose how to pay. Online (a bank app QR) confirms by itself; the branch's own QR or a
          transfer is checked by the team, who are told on WhatsApp. */}
      {hasOnline && transferOn && (
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
      {hasOnline && shownMethod === "online" && (
        <PayOnline
          slug={slug}
          booking={booking}
          guestToken={guestToken}
          onPaid={() => setPaidOnline(true)}
        />
      )}
      {!hasOnline && !transferOn && (
        // both ways are off: the customer cannot pay here; the team confirms by hand
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
          {t("public.events.pay.noWay", { phone })}
        </p>
      )}
      {transferOn && shownMethod === "manual" && (
        <>
          {pay ? (
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
          <ErrorAlert error={slip.error} />
          {/* paid outside the system: the customer talks to the team on WhatsApp, which is faster than waiting
          for someone to look at the website. Tapping the button also tells the system a slip was sent, so
          the hold stops running out and the team sees "slip sent" on their list. */}
          {slipSent && (
            <p className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm font-medium">
              <CheckCircle2Icon className="size-5 shrink-0" />
              {t("public.events.pay.slipDone")}
            </p>
          )}
          {whatsapp ? (
            <Button
              asChild
              size="lg"
              variant={slipSent ? "outline" : "default"}
              className="h-12 text-base"
            >
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  if (!slipSent && !slip.isPending) slip.mutate()
                }}
              >
                <MessageCircleIcon />
                {slipSent
                  ? t("public.events.pay.whatsappAgain")
                  : t("public.events.pay.whatsapp")}
              </a>
            </Button>
          ) : (
            !slipSent && (
              // no WhatsApp number set: the customer calls the branch, and this tells the team a slip is coming
              <Button
                variant="outline"
                size="lg"
                className="h-12 text-base"
                disabled={slip.isPending}
                onClick={() => slip.mutate()}
              >
                <SendIcon />
                {t("public.events.pay.slipSent")}
              </Button>
            )
          )}
        </>
      )}
    </section>
  )
}

/** One line of the branch's account (its name, number or extra text) with a copy button */
function AccountRow({
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
