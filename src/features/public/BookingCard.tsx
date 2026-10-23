import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import type { Booking } from "@/lib/api/types"
import { dayIn, duration, money, timeIn } from "@/lib/format"
import { cn } from "@/lib/utils"

import { bookingTitle, zoneOf } from "./booking-utils"

const STATUS_STYLE: Record<Booking["status"], string> = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-zinc-200 text-zinc-700",
  completed: "bg-sky-100 text-sky-900",
  no_show: "bg-rose-100 text-rose-900",
}

export function StatusBadge({ status }: { status: Booking["status"] }) {
  const { t } = useTranslation()
  return (
    <Badge className={cn("border-0", STATUS_STYLE[status])}>
      {t(`booking.status.${status}`)}
    </Badge>
  )
}

/** A booking's details: what, when, how long, price, payment */
export function BookingCard({
  booking,
  tz,
  showBusiness,
  children,
}: {
  booking: Booking
  tz?: string
  showBusiness?: boolean
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  const zone = tz ?? zoneOf(booking.starts_at)
  const minutes = Math.round(
    (Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60_000,
  )
  const seats = booking.items.find((i) => i.class_session_id)?.seats ?? 0

  return (
    <article
      className={cn(
        "rounded-xl bg-white p-4",
        booking.status === "cancelled" && "opacity-75",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showBusiness && (
            <p className="truncate text-sm text-muted-foreground">
              {booking.branch_name}
            </p>
          )}
          <h3 className="display-tight text-2xl">{bookingTitle(booking)}</h3>
          <p className="text-sm text-muted-foreground">{booking.sport_name}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("booking.when")}</dt>
        <dd className="font-medium">
          {dayIn(booking.starts_at, zone)}, {timeIn(booking.starts_at, zone)}–
          {timeIn(booking.ends_at, zone)}
        </dd>
        <dt className="text-muted-foreground">{t("booking.length")}</dt>
        <dd>{duration(minutes)}</dd>
        {seats > 0 && (
          <>
            <dt className="text-muted-foreground">{t("public.seats")}</dt>
            <dd>{seats}</dd>
          </>
        )}
        <dt className="text-muted-foreground">{t("booking.total")}</dt>
        <dd className="font-medium">
          {money(booking.total_price, booking.currency)}{" "}
          <span className="font-normal text-muted-foreground">
            · {t(`booking.payment.${booking.payment_status}`)}
          </span>
        </dd>
        <dt className="text-muted-foreground">{t("booking.code")}</dt>
        <dd className="font-medium tracking-wider">{booking.code}</dd>
        {booking.cancel_reason && (
          <>
            <dt className="text-muted-foreground">{t("booking.reason")}</dt>
            <dd>{booking.cancel_reason}</dd>
          </>
        )}
      </dl>
      {children}
    </article>
  )
}
