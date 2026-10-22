import { MailIcon, PhoneIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/features/public/BookingCard"
import { bookingTitle } from "@/features/public/booking-utils"
import type { Booking, PaymentMethod } from "@/lib/api/types"
import { dayIn, duration, money, timeIn } from "@/lib/format"
import { displayPhone, telHref } from "@/lib/phone"

import { useSettings } from "../api"
import { useBooking, useChangeStatus, useSetPayment } from "./api"

const METHODS: PaymentMethod[] = ["cash", "transfer", "qr", "other"]

/** One booking at the desk: details, status changes and payment */
export function BookingSheet({
  id,
  onClose,
}: {
  id: number | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const booking = useBooking(id)
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {booking.data ? bookingTitle(booking.data) : t("desk.booking")}
          </SheetTitle>
          <SheetDescription>
            {booking.data && `${t("booking.code")} ${booking.data.code}`}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {booking.isPending ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : booking.isError ? (
            <ErrorAlert error={booking.error} />
          ) : (
            <Details booking={booking.data} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Details({ booking: b }: { booking: Booking }) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const status = useChangeStatus()
  const payment = useSetPayment()
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState("")
  const [now] = useState(() => Date.now())
  const started = Date.parse(b.starts_at) <= now
  const active = b.status === "pending" || b.status === "confirmed"
  const minutes = Math.round(
    (Date.parse(b.ends_at) - Date.parse(b.starts_at)) / 60_000,
  )
  const who = b.customer_name ?? b.guest_name ?? "—"
  const phone = b.guest_phone || b.customer_phone
  const email = b.customer_email

  const change = (next: Booking["status"], why?: string) =>
    status.mutate(
      { id: b.id, status: next, reason: why },
      {
        onSuccess: () => {
          setCancelling(false)
          toast.success(t(`desk.statusDone.${next}`))
        },
      },
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={b.status} />
        <span className="text-sm text-muted-foreground">
          {t(`desk.createdBy.${b.created_by ?? "customer"}`)}
        </span>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("booking.when")}</dt>
        <dd className="font-medium">
          {dayIn(b.starts_at, tz)}, {timeIn(b.starts_at, tz)}–
          {timeIn(b.ends_at, tz)} ({duration(minutes)})
        </dd>
        <dt className="text-muted-foreground">{t("desk.who")}</dt>
        <dd>
          <p className="font-medium">
            {who}
            {b.member_no && (
              <span className="ml-2 font-normal text-muted-foreground">
                {b.member_no}
              </span>
            )}
          </p>
          {phone && (
            <a
              href={telHref(phone)}
              className="inline-flex min-h-9 items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <PhoneIcon className="size-3.5" />
              {displayPhone(phone)}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex min-h-9 items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <MailIcon className="size-3.5" />
              {email}
            </a>
          )}
        </dd>
        {b.items.map((i, n) => (
          <div key={n} className="contents">
            <dt className="text-muted-foreground">
              {t(`desk.itemKind.${i.kind}`)}
            </dt>
            <dd>
              {[i.resource_name, i.coach_name, i.class_title]
                .filter(Boolean)
                .join(" ")}
              {i.seats > 1 && ` × ${i.seats}`} · {money(i.price, b.currency)}
            </dd>
          </div>
        ))}
        {b.notes && (
          <>
            <dt className="text-muted-foreground">{t("desk.notes")}</dt>
            <dd className="whitespace-pre-line">{b.notes}</dd>
          </>
        )}
        {b.cancel_reason && (
          <>
            <dt className="text-muted-foreground">{t("booking.reason")}</dt>
            <dd>{b.cancel_reason}</dd>
          </>
        )}
      </dl>

      <section className="space-y-3 rounded-xl border p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">
            {t("booking.total")}
          </span>
          <span className="text-xl font-semibold tabular-nums">
            {money(b.total_price, b.currency)}
          </span>
        </div>
        {b.payment_status === "paid" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-emerald-700">
              {t("desk.paidWith", {
                method: t(`desk.methods.${b.payment_method ?? "other"}`),
                when: b.paid_at
                  ? `${dayIn(b.paid_at, tz)} ${timeIn(b.paid_at, tz)}`
                  : "",
              })}
            </p>
            <Button
              variant="ghost"
              className="h-11 px-2 text-muted-foreground lg:h-9"
              disabled={payment.isPending}
              onClick={() => payment.mutate({ id: b.id, status: "unpaid" })}
            >
              {t("desk.markUnpaid")}
            </Button>
          </div>
        ) : b.status !== "cancelled" ? (
          <div className="space-y-2">
            <p className="text-sm">{t("desk.markPaidWith")}</p>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <Button
                  key={m}
                  variant="outline"
                  className="h-12 lg:h-10"
                  disabled={payment.isPending}
                  onClick={() =>
                    payment.mutate(
                      { id: b.id, status: "paid", method: m },
                      { onSuccess: () => toast.success(t("desk.paidDone")) },
                    )
                  }
                >
                  {t(`desk.methods.${m}`)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <ErrorAlert error={payment.error} />
      </section>

      {active && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {b.status === "pending" && (
              <Button
                className="h-11 lg:h-9"
                disabled={status.isPending}
                onClick={() => change("confirmed")}
              >
                {t("desk.confirm")}
              </Button>
            )}
            {b.status === "confirmed" && started && (
              <>
                <Button
                  className="h-11 lg:h-9"
                  disabled={status.isPending}
                  onClick={() => change("completed")}
                >
                  {t("desk.complete")}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 lg:h-9"
                  disabled={status.isPending}
                  onClick={() => change("no_show")}
                >
                  {t("desk.noShow")}
                </Button>
              </>
            )}
            {!cancelling && (
              <Button
                variant="destructive"
                className="h-11 lg:h-9"
                onClick={() => setCancelling(true)}
              >
                {t("booking.cancel")}
              </Button>
            )}
          </div>
          {b.status === "confirmed" && !started && (
            <p className="text-sm text-muted-foreground">
              {t("desk.afterStart")}
            </p>
          )}
          {cancelling && (
            <div className="space-y-2 rounded-xl border p-3">
              <Label htmlFor="desk-cancel-reason">
                {t("desk.cancelReason")}
              </Label>
              <Textarea
                id="desk-cancel-reason"
                rows={2}
                maxLength={255}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {t("desk.cancelEmail")}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="h-11 lg:h-9"
                  disabled={status.isPending}
                  onClick={() => change("cancelled", reason.trim())}
                >
                  {status.isPending && <Spinner />}
                  {t("booking.cancelConfirm")}
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 lg:h-9"
                  onClick={() => setCancelling(false)}
                >
                  {t("booking.keep")}
                </Button>
              </div>
            </div>
          )}
          <ErrorAlert error={status.error} />
        </section>
      )}
    </div>
  )
}
