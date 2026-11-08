import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useBiz } from "@/hooks/use-branch"
import { bookingService } from "@/services/booking.api"
import type {
  Booking,
  BookingFilters,
  ReserveTablesInput,
  StaffBookingInput,
  WalkInInput,
} from "@/types/booking"

export function useBookingList(q: BookingFilters) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("bookings", q),
    queryFn: () => bookingService.list(branchId, q),
    placeholderData: keepPreviousData,
  })
}

/**
 * How many bookings wait for approval at a branch, for the badge on the Bookings menu. It sits
 * under the branch's "bookings" cache key, so approving or declining one refreshes it at once; it
 * is also read again every 30 seconds and when the tab is opened, to catch new requests.
 */
export function usePendingBookings(branchId: number | undefined) {
  return useQuery({
    queryKey: ["manage", branchId, "bookings", { pending: "count" }],
    queryFn: () => bookingService.pending(branchId as number),
    select: (page) => page.meta.total,
    enabled: branchId !== undefined,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useBooking(id: number | null) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("booking", id),
    queryFn: () => bookingService.get(branchId, id as number),
    enabled: !!id,
  })
}

/** Courts and coaches side by side, `days` days from `date` (1 to 7) */
export function useCalendar(date: string, days: number) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("calendar", date, days),
    queryFn: () => bookingService.calendar(branchId, date, days),
    placeholderData: keepPreviousData,
    // the desk screen stays open all day: pick up online bookings
    refetchInterval: 60_000,
  })
}

/** Free starts staff may book (no notice or days-ahead limit), with prices */
export function useDeskAvailability(
  q: {
    date: string
    resource_id?: number
    coach_id?: number
    sport_id?: number
  } | null,
) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("availability", q),
    queryFn: () => bookingService.availability(branchId, q!),
    enabled: !!q,
    placeholderData: keepPreviousData,
  })
}

/** The free times and tables of a day for a group, as the team sees them (kept tables included) */
export function useDeskTableAvailability(date: string, guests: number) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("table-availability", date, guests),
    queryFn: () => bookingService.tableAvailability(branchId, date, guests),
    enabled: !!date && guests > 0,
    placeholderData: keepPreviousData,
  })
}

// ---------- changes at the desk: every screen that shows bookings or money refreshes ----------

function useDeskChange<I>(
  fn: (branchId: number, input: I) => Promise<Booking>,
) {
  const { id: branchId, key } = useBiz()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: I) => fn(branchId, input),
    onSuccess: (booking) => {
      queryClient.setQueryData(key("booking", booking.id), booking)
      for (const part of [
        "bookings",
        "calendar",
        "reports",
        "cashup",
        "customers",
        "availability",
      ]) {
        void queryClient.invalidateQueries({ queryKey: key(part) })
      }
      void queryClient.invalidateQueries({ queryKey: ["public"] })
    },
  })
}

export const useCreateDeskBooking = () =>
  useDeskChange((branchId, body: StaffBookingInput) =>
    bookingService.create(branchId, body),
  )

export const useChangeStatus = () => useDeskChange(bookingService.setStatus)

export const useSetPayment = () => useDeskChange(bookingService.setPayment)

export const useMarkArrived = () => useDeskChange(bookingService.markArrived)

export const useMoveTables = () => useDeskChange(bookingService.moveTables)

export const useWalkIn = () =>
  useDeskChange((branchId, body: WalkInInput) =>
    bookingService.walkIn(branchId, body),
  )

/** Book tables for a customer who phoned: confirmed at once */
export const useReserveTables = () =>
  useDeskChange((branchId, body: ReserveTablesInput) =>
    bookingService.reserveTables(branchId, body),
  )
