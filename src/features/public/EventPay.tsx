import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  CheckCircle2Icon,
  ClockIcon,
  MessageCircleIcon,
  SendIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import type { Booking, EventPay } from "@/lib/api/types"
import { dayIn, money, timeIn } from "@/lib/format"

import { publicKeys, slipApi } from "./api"
import { PayOnline } from "./PayOnline"

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

  const pay = info?.pay
  const total = pay?.total ?? booking.total_price
  const currency = pay?.currency ?? booking.currency
  const holdUntil = pay?.hold_until ?? booking.pay_by
  const slipSent = !!(booking.slip_sent_at ?? slip.data?.slip_sent_at)
  const whatsapp = (pay?.whatsapp ?? "").replace(/[^\d]/g, "")
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
      {/* online first: the booking confirms itself; the QR / transfer way below stays for those who prefer it */}
      <PayOnline
        slug={slug}
        booking={booking}
        guestToken={guestToken}
        onPaid={() => setPaidOnline(true)}
      />
      {info ? (
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
            </figure>
          )}
          {pay?.note && (
            <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-line">
              {pay.note}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("public.events.pay.noInfo", { phone })}
        </p>
      )}
      <ErrorAlert error={slip.error} />
      {slipSent ? (
        <p className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm font-medium">
          <CheckCircle2Icon className="size-5 shrink-0" />
          {t("public.events.pay.slipDone")}
        </p>
      ) : (
        <div className="grid gap-2">
          {whatsapp && (
            <Button asChild size="lg" className="h-12 text-base">
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircleIcon />
                {t("public.events.pay.whatsapp")}
              </a>
            </Button>
          )}
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
        </div>
      )}
    </section>
  )
}
