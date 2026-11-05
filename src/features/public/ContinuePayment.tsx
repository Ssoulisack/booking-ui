import { WalletIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import type { Booking } from "@/lib/api/types"
import { dayIn, timeIn } from "@/lib/format"

import { usePaymentOptions } from "./api"
import { zoneOf } from "./booking-utils"
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
    <div className="space-y-1.5">
      <Button asChild size="lg" className="h-12 w-full text-base">
        <Link to={`/account/bookings/${booking.id}`}>
          <WalletIcon />
          {t("account.continuePay")}
        </Link>
      </Button>
      {waitingForMoney(booking) && booking.pay_by && !booking.slip_sent_at && (
        <p className="text-center text-xs text-muted-foreground">
          {t("account.payBefore", {
            when: `${dayIn(booking.pay_by, tz)}, ${timeIn(booking.pay_by, tz)}`,
          })}
        </p>
      )}
    </div>
  )
}
