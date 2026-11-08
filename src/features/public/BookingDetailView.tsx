import { useTranslation } from "react-i18next"

import { dayIn, timeIn } from "@/lib/format"
import type { Booking } from "@/types/booking"

import { BookingCard } from "./BookingCard"
import { canCancel } from "./booking-utils"
import { CancelDialog } from "./CancelDialog"
import { EventPayPanel, recallPay } from "./EventPay"
import { PayOnline, payableOnline } from "./PayOnline"

/**
 * One booking, for its owner: the payment step while money is due (the same panel right after booking),
 * the booking's details, and cancel. Used by the guest's private link and by a logged-in customer's
 * own booking page, so both look and act the same.
 */
export function BookingDetailView({
  slug,
  booking,
  tz,
  phone,
  guestToken,
  cancel,
}: {
  slug: string
  booking: Booking
  tz: string
  /** the branch phone, for "too late to cancel" and a device that does not know how to pay */
  phone: string
  guestToken?: string
  cancel: {
    pending: boolean
    error: unknown
    onConfirm: (reason: string) => void
  }
}) {
  const { t } = useTranslation()
  return (
    <>
      {booking.event_id && booking.status !== "completed" && (
        <EventPayPanel
          slug={slug}
          tz={tz}
          phone={phone}
          booking={booking}
          guestToken={guestToken}
          info={recallPay(slug, booking.id)}
        />
      )}
      {!booking.event_id && payableOnline(booking) && (
        <PayOnline slug={slug} booking={booking} guestToken={guestToken} />
      )}
      <BookingCard booking={booking} tz={tz}>
        <div className="mt-4 border-t pt-4">
          {canCancel(booking) ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("booking.cancelUntil", {
                  when: `${dayIn(booking.cancellable_until, tz)}, ${timeIn(booking.cancellable_until, tz)}`,
                })}
              </p>
              <CancelDialog
                visitReturns={!!booking.package}
                pending={cancel.pending}
                error={cancel.error}
                onConfirm={cancel.onConfirm}
              />
            </div>
          ) : (
            booking.status !== "cancelled" && (
              <p className="text-sm text-muted-foreground">
                {phone
                  ? t("booking.tooLateToCancel", { phone })
                  : t("booking.tooLateToCancelNoPhone")}
              </p>
            )
          )}
        </div>
      </BookingCard>
    </>
  )
}
