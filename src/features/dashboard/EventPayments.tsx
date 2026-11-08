import { CheckCircle2Icon, ClockIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { bookingTitle } from "@/features/public/booking-utils"
import type { Booking } from "@/types/booking"
import { dayIn, money, timeIn } from "@/lib/format"

import { useSettings } from "@/hooks/use-branch"
import { BookingSheet } from "./desk/BookingSheet"
import { useBookingList } from "./desk/api"
import { Panel } from "./ui"

/**
 * Event days: the tables customers bought and have not paid yet. The team checks the slip (sent on
 * WhatsApp), then opens the booking to confirm it paid, or releases the tables. Hidden when empty.
 */
export function EventPayments() {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  // event bookings wait as pending until the money is confirmed
  const list = useBookingList({ status: "pending", limit: 50 })
  const [open, setOpen] = useState<number | null>(null)
  const waiting = (list.data?.items ?? [])
    .filter((b) => b.event_id && b.payment_status === "unpaid")
    // slips sent come first: those are waiting for the team
    .sort(
      (a, b) =>
        Number(!!b.slip_sent_at) - Number(!!a.slip_sent_at) ||
        Date.parse(a.pay_by ?? "") - Date.parse(b.pay_by ?? ""),
    )
  if (waiting.length === 0) return null

  return (
    <Panel
      title={t("eventPay.title")}
      lead={t("eventPay.lead", { count: waiting.length })}
    >
      <ul className="divide-y">
        {waiting.map((b) => (
          <Row key={b.id} booking={b} tz={tz} onOpen={() => setOpen(b.id)} />
        ))}
      </ul>
      <BookingSheet id={open} onClose={() => setOpen(null)} />
    </Panel>
  )
}

function Row({
  booking: b,
  tz,
  onOpen,
}: {
  booking: Booking
  tz: string
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const who = b.customer_name || b.guest_name || "—"
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 w-full flex-wrap items-center gap-x-4 gap-y-1 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {who}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {b.code}
            </span>
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {bookingTitle(b)} · {dayIn(b.starts_at, tz)}
            {b.guests ? ` · ${b.guests}` : ""}
          </p>
        </div>
        <span className="font-semibold tabular-nums">
          {money(b.total_price, b.currency)}
        </span>
        {b.slip_sent_at ? (
          <Badge className="gap-1">
            <CheckCircle2Icon className="size-3.5" />
            {t("eventPay.slipAt", { time: timeIn(b.slip_sent_at, tz) })}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <ClockIcon className="size-3.5" />
            {b.pay_by
              ? t("eventPay.payBy", {
                  when: `${dayIn(b.pay_by, tz)} ${timeIn(b.pay_by, tz)}`,
                })
              : t("eventPay.noSlip")}
          </Badge>
        )}
      </button>
    </li>
  )
}
