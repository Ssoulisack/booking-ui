import {
  useMutation,
  useQuery,
  type UseMutationOptions,
} from "@tanstack/react-query"

import { bookingRefetchMs, publicKeys } from "@/hooks/use-public"
import { accountService } from "@/services/account.api"
import type { Booking } from "@/types/booking"
import type { CustomerPackage } from "@/types/package"

type Options<Data, Vars> = Omit<
  UseMutationOptions<Data, Error, Vars>,
  "mutationFn"
>

export const packageKeys = {
  mine: ["me", "packages"] as const,
  list: (slug: string) => ["public", slug, "packages"] as const,
}

export function useMyBookings(status?: string) {
  return useQuery({
    queryKey: publicKeys.myBookings,
    queryFn: () => accountService.bookings(status),
    // approvals, payments and cancellations by the team show up without a reload
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

/** A logged-in customer's own booking, kept up to date while it is open (the team may approve or cancel it) */
export function useMyBooking(id: number) {
  return useQuery({
    queryKey: ["me", "bookings", "one", id] as const,
    queryFn: () => accountService.booking(id),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (q) => bookingRefetchMs(q.state.data),
  })
}

export function useClaimBooking(options?: Options<Booking, string>) {
  return useMutation({
    mutationFn: (code: string) => accountService.claim(code),
    ...options,
  })
}

export function useCancelMyBooking(
  id: number,
  options?: Options<Booking, string>,
) {
  return useMutation({
    mutationFn: (reason: string) => accountService.cancelBooking(id, reason),
    ...options,
  })
}

/** Everything the logged-in customer bought, at every branch; kept fresh while one waits for payment */
export function useMyPackages(enabled = true) {
  return useQuery({
    queryKey: packageKeys.mine,
    queryFn: accountService.packages,
    enabled,
    refetchOnWindowFocus: true,
    refetchInterval: (q) =>
      q.state.data?.some((p) => p.status === "pending_payment")
        ? 10_000
        : false,
  })
}

export function useMyPackageVisits(id: number | null) {
  return useQuery({
    queryKey: [...packageKeys.mine, "visits", id] as const,
    queryFn: () => accountService.packageVisits(id as number),
    enabled: id !== null,
  })
}

export function useCancelMyPackage(options?: Options<CustomerPackage, number>) {
  return useMutation({
    mutationFn: (id: number) => accountService.cancelPackage(id),
    ...options,
  })
}
