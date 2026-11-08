import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { bookingApi, publicKeys, useGuestBooking } from "./api"
import { BookingDetailView } from "./BookingDetailView"
import { CancelledNotice } from "./CancelledNotice"
import { usePublic } from "./context"

/** /b/:slug/booking/:token — a guest's private link: see the booking and cancel it */
export function GuestBookingPage() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const { token = "" } = useParams()
  const queryClient = useQueryClient()
  const booking = useGuestBooking(slug, token)
  // told when the team cancels it while this page is open (not when the guest cancels it here)
  const wasOpen = useRef(false)
  if (
    booking.data &&
    (booking.data.status === "pending" || booking.data.status === "confirmed")
  )
    wasOpen.current = true

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
      <h1 className="display-tight text-4xl">{t("public.yourBooking")}</h1>
      {booking.isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : booking.isError ? (
        <ErrorAlert error={booking.error} />
      ) : (
        <BookingDetailView
          slug={slug}
          booking={booking.data}
          tz={business.timezone}
          phone={business.phone}
          guestToken={token}
          cancel={{
            pending: cancel.isPending,
            error: cancel.error,
            onConfirm: (reason) => cancel.mutate(reason),
          }}
        />
      )}
      <Button asChild variant="outline" className="h-12 w-full">
        <Link to={`/b/${slug}#book`}>{t("public.bookAnother")}</Link>
      </Button>
      {booking.data?.status === "cancelled" &&
        wasOpen.current &&
        !cancel.isSuccess && (
          <CancelledNotice
            booking={booking.data}
            slug={slug}
            phone={business.phone}
          />
        )}
    </main>
  )
}
