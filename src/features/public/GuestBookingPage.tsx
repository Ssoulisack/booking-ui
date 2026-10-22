import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { bookingApi, publicKeys, useGuestBooking } from "./api"
import { BookingCard } from "./BookingCard"
import { canCancel } from "./booking-utils"
import { CancelDialog } from "./CancelDialog"
import { usePublic } from "./context"
import { dayIn, timeIn } from "@/lib/format"

/** /b/:slug/booking/:token — a guest's private link: see the booking and cancel it */
export function GuestBookingPage() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const { token = "" } = useParams()
  const queryClient = useQueryClient()
  const booking = useGuestBooking(slug, token)

  const cancel = useMutation({
    mutationFn: (reason: string) => bookingApi.cancelGuest(slug, token, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(publicKeys.guestBooking(slug, token), updated)
      void queryClient.invalidateQueries({ queryKey: ["public", slug] })
      toast.success(t("booking.cancelled"))
    },
  })

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 pt-8 pb-16">
      <h1 className="text-4xl display-tight">{t("public.yourBooking")}</h1>
      {booking.isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : booking.isError ? (
        <ErrorAlert error={booking.error} />
      ) : (
        <BookingCard booking={booking.data} tz={business.timezone}>
          <div className="mt-4 border-t pt-4">
            {canCancel(booking.data) ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t("booking.cancelUntil", {
                    when: `${dayIn(booking.data.cancellable_until, business.timezone)}, ${timeIn(booking.data.cancellable_until, business.timezone)}`,
                  })}
                </p>
                <CancelDialog
                  pending={cancel.isPending}
                  error={cancel.error}
                  onConfirm={(reason) => cancel.mutate(reason)}
                />
              </div>
            ) : (
              booking.data.status !== "cancelled" && (
                <p className="text-sm text-muted-foreground">
                  {t("booking.tooLateToCancel", { phone: business.phone })}
                </p>
              )
            )}
          </div>
        </BookingCard>
      )}
      <Button asChild variant="outline" className="h-12 w-full">
        <Link to={`/b/${slug}#book`}>{t("public.bookAnother")}</Link>
      </Button>
    </main>
  )
}
