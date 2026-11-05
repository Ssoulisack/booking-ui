import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import type { Booking } from "@/lib/api/types"
import { dayIn, duration, money, timeIn } from "@/lib/format"
import { floorName } from "@/lib/floor-plan"
import { cn } from "@/lib/utils"

import { bookingTitle, zoneOf } from "./booking-utils"
import { CopyCode } from "./CopyCode"

const STATUS_STYLE: Record<Booking["status"], string> = {
  pending:
    "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
  confirmed:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200",
  cancelled: "bg-zinc-200 text-zinc-700 dark:bg-white/10 dark:text-zinc-300",
  completed: "bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-200",
  no_show: "bg-rose-100 text-rose-900 dark:bg-rose-400/20 dark:text-rose-200",
}

export function StatusBadge({
  status,
  awaitingPayment,
}: {
  status: Booking["status"]
  /** an event booking waits for the money, not for the team's approval */
  awaitingPayment?: boolean
}) {
  const { t } = useTranslation()
  return (
    <Badge className={cn("border-0", STATUS_STYLE[status])}>
      {awaitingPayment
        ? t("booking.status.awaitingPayment")
        : t(`booking.status.${status}`)}
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
        "rounded-xl bg-card p-4",
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
          <p className="text-sm text-muted-foreground">
            {booking.sport_name}
            {/* a table: which floor its area is on */}
            {booking.guests && booking.area_floor !== undefined
              ? ` · ${floorName(t, booking.area_floor)}`
              : ""}
            {booking.guests && booking.zones ? ` · ${booking.zones}` : ""}
          </p>
        </div>
        <StatusBadge
          status={booking.status}
          awaitingPayment={
            !!booking.event_id &&
            booking.status === "pending" &&
            booking.payment_status === "unpaid"
          }
        />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {booking.guests ? (
          // a table: when, how many, and the time to be there by (no length or price)
          <>
            <dt className="text-muted-foreground">{t("booking.when")}</dt>
            <dd className="font-medium">
              {dayIn(booking.starts_at, zone)}
              {/* a bar booking is for the evening: only the arrive-by time matters */}
              {booking.booking_style !== "arrive_by" &&
                `, ${timeIn(booking.starts_at, zone)}`}
            </dd>
            <dt className="text-muted-foreground">
              {t("public.tables.people")}
            </dt>
            <dd>{t("public.tables.guestsLine", { count: booking.guests })}</dd>
            {booking.arrive_by && (
              <>
                <dt className="text-muted-foreground">
                  {t("public.tables.arriveByLabel")}
                </dt>
                <dd className="font-medium">
                  {timeIn(booking.arrive_by, zone)}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">{t("booking.total")}</dt>
            {/* an event day: the tables were sold */}
            {booking.event_id ? (
              <dd className="font-medium">
                {money(booking.total_price, booking.currency)}{" "}
                <span className="font-normal text-muted-foreground">
                  ·{" "}
                  {booking.payment_status === "unpaid"
                    ? t("booking.payment.eventUnpaid")
                    : t(`booking.payment.${booking.payment_status}`)}
                </span>
              </dd>
            ) : (
              <dd>{t("public.tables.free")}</dd>
            )}
          </>
        ) : (
          <>
            <dt className="text-muted-foreground">{t("booking.when")}</dt>
            <dd className="font-medium">
              {dayIn(booking.starts_at, zone)},{" "}
              {timeIn(booking.starts_at, zone)}–{timeIn(booking.ends_at, zone)}
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
          </>
        )}
        <dt className="text-muted-foreground">{t("booking.code")}</dt>
        <dd className="flex items-center gap-1 font-medium tracking-wider">
          {booking.code}
          <CopyCode code={booking.code} compact />
        </dd>
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
