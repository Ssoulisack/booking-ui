import { WalletIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import type { Booking } from "@/types/booking"

import { usePaymentOptions } from "@/hooks/use-public"
import { zoneOf } from "./booking-utils"
import { HoldClock } from "./EventPay"
import { payableOnline } from "./PayOnline"

/** An event booking that still waits for the money (the tables are held until it is paid or the time runs out) */
export function waitingForMoney(b: Booking) {
  return !!b.event_id && b.status === "pending" && b.payment_status === "unpaid"
}

/**
 * "Continue payment" on a customer's own booking list: it opens the booking's page, which is the same
 * payment step as right after booking (the QR that is still open, or the ways to pay). Someone who left
 * the pay page can come back while there is time.
 */
export function ContinuePayment({ booking }: { booking: Booking }) {
  const { t } = useTranslation()
  const options = usePaymentOptions(booking.branch_slug)
  const canPayOnline = payableOnline(booking) && !!options.data?.length
  if (!waitingForMoney(booking) && !canPayOnline) return null
  const tz = zoneOf(booking.starts_at)
  return (
    <div className="space-y-3">
      {/* the same clock as on the pay step: until when the tables are held, and what happens after */}
      {waitingForMoney(booking) && booking.pay_by && (
        <HoldClock
          until={booking.pay_by}
          tz={tz}
          slipSent={!!booking.slip_sent_at}
          slipSentAt={booking.slip_sent_at}
          big={false}
          compact
        />
      )}
      {/* after a slip is sent there is nothing more to pay: the team checks it (the box above says so) */}
      {!booking.slip_sent_at && (
        <Button asChild size="lg" className="h-12 w-full text-base">
          <Link to={`/account/bookings/${booking.id}`}>
            <WalletIcon />
            {t("account.continuePay")}
          </Link>
        </Button>
      )}
    </div>
  )
}
