import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeftIcon } from "lucide-react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { bookingApi, publicKeys, useMyBooking } from "@/features/public/api"
import { zoneOf } from "@/features/public/booking-utils"
import { BookingDetailView } from "@/features/public/BookingDetailView"
import { CancelledNotice } from "@/features/public/CancelledNotice"

/**
 * /account/bookings/:id — one of the customer's own bookings: the same page as a guest's private link
 * (payment step while money is due, details, cancel). "Continue payment" on My bookings leads here.
 */
export function AccountBookingPage() {
  const { t } = useTranslation()
  const id = Number(useParams().id)
  const queryClient = useQueryClient()
  const booking = useMyBooking(id)
  // told when the team cancels it while this page is open (not when the customer cancels it here)
  const wasOpen = useRef(false)
  const b = booking.data
  if (b && (b.status === "pending" || b.status === "confirmed"))
    wasOpen.current = true

  const cancel = useMutation({
    mutationFn: (reason: string) => bookingApi.cancelMine(id, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me", "bookings", "one", id], updated)
      void queryClient.invalidateQueries({ queryKey: publicKeys.myBookings })
      void queryClient.invalidateQueries({
        queryKey: ["public", updated.branch_slug],
      })
      toast.success(t("booking.cancelled"))
    },
  })

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link to="/account">
          <ArrowLeftIcon />
          {t("nav.myBookings")}
        </Link>
      </Button>
      <h1 className="display-tight text-4xl">{t("public.yourBooking")}</h1>
      {booking.isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : booking.isError || !b ? (
        <PageError error={booking.error} onRetry={() => booking.refetch()} />
      ) : (
        <BookingDetailView
          slug={b.branch_slug}
          booking={b}
          tz={zoneOf(b.starts_at)}
          phone=""
          cancel={{
            pending: cancel.isPending,
            error: cancel.error,
            onConfirm: (reason) => cancel.mutate(reason),
          }}
        />
      )}
      {b?.status === "cancelled" && wasOpen.current && !cancel.isSuccess && (
        <CancelledNotice booking={b} slug={b.branch_slug} phone="" />
      )}
    </div>
  )
}
