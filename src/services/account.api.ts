import { api, apiPage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { Booking } from "@/types/booking"
import type { CustomerPackage, PackageVisit } from "@/types/package"

// The logged-in customer's own bookings and packages, at every branch

export const accountService = {
  booking: (id: number) => api<Booking>(API_ENDPOINTS.ME.BOOKING(id)),
  bookings: (status?: string) =>
    apiPage<Booking>(API_ENDPOINTS.ME.BOOKINGS, {
      query: { limit: 100, status },
    }),
  /** add a booking made as a guest to this account: it must have been made with the phone on the account */
  claim: (code: string) =>
    api<Booking>(API_ENDPOINTS.ME.BOOKINGS_CLAIM, {
      method: "POST",
      body: { code },
    }),
  cancelBooking: (id: number, reason: string) =>
    api<Booking>(API_ENDPOINTS.ME.BOOKING_CANCEL(id), {
      method: "POST",
      body: { reason },
    }),

  packages: () => api<CustomerPackage[]>(API_ENDPOINTS.ME.PACKAGES),
  packageVisits: (id: number) =>
    api<PackageVisit[]>(API_ENDPOINTS.ME.PACKAGE_VISITS(id)),
  cancelPackage: (id: number) =>
    api<CustomerPackage>(API_ENDPOINTS.ME.PACKAGE_CANCEL(id), {
      method: "POST",
    }),
}
