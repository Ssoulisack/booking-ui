import { ArrowRightIcon, CalendarClockIcon, UsersIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { ErrorAlert } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/public/booking/BookingCard"
import { bookingTitle } from "@/components/public/booking/booking-utils"
import type { Booking } from "@/types/booking"
import { dayIn, nextDays, timeIn, todayIn } from "@/lib/format"

import { useSettings } from "@/hooks/use-branch"
import { useDashboard } from "@/components/provider/dashboard-context"
import { useBookingList } from "@/hooks/use-booking"
import { Panel } from "./ui"

const SHOWN = 8

/** The next bookings of the week (still to come or going on now), for every role */
export function UpcomingBookings() {
  const { t } = useTranslation()
  const { branch } = useDashboard()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const today = todayIn(tz)
  const list = useBookingList({
    from: today,
    to: nextDays(tz, 7)[6],
    limit: 50,
  })
  // the moment the page opened: a booking that ended before it is not "coming up"
  const [now] = useState(() => Date.now())
  const upcoming = (list.data?.items ?? []).filter(
    (b) =>
      (b.status === "pending" || b.status === "confirmed") &&
      Date.parse(b.ends_at) > now,
  )
  const base = `/dashboard/${branch.branch_id}`

  return (
    <Panel
      title={t("upcoming.title")}
      lead={t("upcoming.lead")}
      actions={
        <Button asChild variant="outline" className="h-11 lg:h-9">
          <Link to={`${base}/bookings?period=week`}>
            {t("upcoming.all")}
            <ArrowRightIcon />
          </Link>
        </Button>
      }
    >
      {list.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorAlert error={list.error} />
      ) : upcoming.length === 0 ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <CalendarClockIcon className="size-5" />
          {t("upcoming.none")}
        </p>
      ) : (
        <ul className="divide-y">
          {upcoming.slice(0, SHOWN).map((b) => (
            <Row key={b.id} booking={b} tz={tz} today={today} />
          ))}
        </ul>
      )}
    </Panel>
  )
}

function Row({
  booking: b,
  tz,
  today,
}: {
  booking: Booking
  tz: string
  today: string
}) {
  const { t } = useTranslation()
  const who = b.customer_name || b.guest_name || "—"
  const isToday = todayIn(tz, new Date(b.starts_at)) === today
  // a bar booking is for the evening: show when the group must be there
  const time =
    b.booking_style === "arrive_by" && b.arrive_by
      ? t("upcoming.arriveBy", { time: timeIn(b.arrive_by, tz) })
      : timeIn(b.starts_at, tz)
  return (
    <li className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 py-2">
      <div className="w-28 shrink-0">
        <p className="font-semibold tabular-nums">{time}</p>
        <p className="text-xs text-muted-foreground">
          {isToday ? t("upcoming.today") : dayIn(b.starts_at, tz)}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{who}</p>
        <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          {bookingTitle(b)}
          {b.guests ? (
            <span className="inline-flex items-center gap-1">
              · <UsersIcon className="size-3.5" />
              {b.guests}
            </span>
          ) : null}
        </p>
      </div>
      <StatusBadge
        status={b.status}
        slipSent={!!b.slip_sent_at}
        awaitingPayment={
          !!b.event_id &&
          b.status === "pending" &&
          b.payment_status === "unpaid"
        }
        staff
      />
    </li>
  )
}
