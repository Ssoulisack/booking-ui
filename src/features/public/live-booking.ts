import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import type { Booking } from "@/types/booking"

const open = (b: Booking) => b.status === "pending" || b.status === "confirmed"

/**
 * A booking kept up to date while the customer looks at it: the team may approve or cancel it, and a
 * payment may arrive. Asked again every few seconds while it is open (faster while it waits for an
 * approval or for money), and when the tab is opened again; a closed booking (cancelled, completed) stops.
 * `initial` is what the page already knows (the answer to booking, or the private link's booking).
 */
export function useLiveBooking(
  slug: string,
  initial: Booking,
  guestToken?: string,
) {
  const path = guestToken
    ? `/public/branches/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(guestToken)}`
    : `/me/bookings/${initial.id}`
  return useQuery({
    queryKey: ["public", slug, "live-booking", initial.id],
    queryFn: () => api<Booking>(path),
    initialData: initial,
    // what the page holds may be old (a reload keeps it): ask at once
    initialDataUpdatedAt: 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (q) => {
      const b = q.state.data
      if (!b || !open(b)) return false
      const waiting = b.status === "pending" || b.payment_status === "unpaid"
      return waiting ? 5_000 : 20_000
    },
    // a private link that stopped working must not hide the booking we already know
    retry: false,
  })
}
