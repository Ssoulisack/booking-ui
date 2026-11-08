import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { api, apiPage, download } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  Booking,
  BookingStatus,
  PaymentMethod,
  StaffBookingInput,
} from "@/types/booking"
import type { Calendar } from "@/types/calendar"
import type { Customer, CustomerMatch } from "@/types/customer"
import type { TableAvailability } from "@/types/floor-plan"
import type { StaffPayment } from "@/types/payment"
import type { Availability } from "@/types/public"
import type {
  BookingsReport,
  CashUp,
  Finance,
  UnpaidRow,
  Transactions,
  Utilisation,
  EventReport,
  TableReport,
} from "@/types/report"

import { useBiz } from "../api"

export interface BookingFilters {
  page?: number
  limit?: number
  keyword?: string
  from?: string
  to?: string
  status?: string
  payment_status?: string
  sport_id?: number
  resource_id?: number
  coach_id?: number
  customer_id?: number
}

export function useBookingList(q: BookingFilters) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("bookings", q),
    queryFn: () =>
      apiPage<Booking>(API_ENDPOINTS.BRANCH.BOOKINGS(branchId as number), {
        query: { ...q },
      }),
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
    queryFn: () =>
      apiPage<Booking>(API_ENDPOINTS.BRANCH.BOOKINGS(branchId as number), {
        query: { status: "pending", limit: 1 },
      }),
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
    queryFn: () =>
      api<Booking>(API_ENDPOINTS.BRANCH.BOOKING(branchId, id as number)),
    enabled: !!id,
  })
}

/** Courts and coaches side by side, `days` days from `date` (1 to 7) */
export function useCalendar(date: string, days: number) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("calendar", date, days),
    queryFn: () =>
      api<Calendar>(API_ENDPOINTS.BRANCH.CALENDAR(branchId), {
        query: { date, days },
      }),
    placeholderData: keepPreviousData,
    // the desk screen stays open all day: pick up online bookings
    refetchInterval: 60_000,
  })
}

/** Whose account is it? By phone, customer number (CNO000042) or email — shown before booking for it */
export function useFindCustomer() {
  const { id: branchId } = useBiz()
  return useMutation({
    mutationFn: (q: string) =>
      api<CustomerMatch>(API_ENDPOINTS.BRANCH.CUSTOMERS_FIND(branchId), {
        query: { q },
      }),
  })
}

export function useCustomers(keyword: string, page: number, limit = 20) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("customers", keyword, page, limit),
    queryFn: () =>
      apiPage<Customer>(API_ENDPOINTS.BRANCH.CUSTOMERS(branchId), {
        query: { keyword, page, limit },
      }),
    placeholderData: keepPreviousData,
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
    queryFn: () =>
      api<Availability>(API_ENDPOINTS.BRANCH.AVAILABILITY(branchId), {
        query: { ...q },
      }),
    enabled: !!q,
    placeholderData: keepPreviousData,
  })
}

export type ReportKind =
  "bookings" | "utilisation" | "finance" | "unpaid" | "transactions"

type ReportOf = {
  bookings: BookingsReport
  utilisation: Utilisation
  finance: Finance
  unpaid: UnpaidRow[]
  transactions: Transactions
}

export function useReport<K extends ReportKind>(
  kind: K,
  from: string,
  to: string,
) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("reports", kind, from, to),
    queryFn: () =>
      api<ReportOf[K]>(API_ENDPOINTS.BRANCH.REPORT(branchId, kind), {
        query: { from, to },
      }),
    placeholderData: keepPreviousData,
  })
}

/** One page of the unpaid list (the server pages it; the CSV button still downloads every row) */
export function useUnpaidPage(
  from: string,
  to: string,
  page: number,
  limit: number,
) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("reports", "unpaid", from, to, page, limit),
    queryFn: () =>
      apiPage<UnpaidRow>(API_ENDPOINTS.BRANCH.REPORTS_UNPAID(branchId), {
        query: { from, to, page, limit },
      }),
    placeholderData: keepPreviousData,
  })
}

export function useCashUp(date: string) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("cashup", date),
    queryFn: () =>
      api<CashUp>(API_ENDPOINTS.BRANCH.REPORTS_CASH_UP(branchId), {
        query: { date },
      }),
  })
}

/** Saves a report as CSV (utilisation, finance, unpaid, cash-up) */
export function useCsv() {
  const { id: branchId } = useBiz()
  return useMutation({
    mutationFn: (p: {
      report: string
      query: Record<string, string>
      filename: string
    }) =>
      download(
        API_ENDPOINTS.BRANCH.REPORT(branchId, p.report),
        { query: { ...p.query, format: "csv" } },
        p.filename,
      ),
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

export function useCreateDeskBooking() {
  return useDeskChange((branchId, body: StaffBookingInput) =>
    api<Booking>(API_ENDPOINTS.BRANCH.BOOKINGS(branchId), {
      method: "POST",
      body,
    }),
  )
}

export function useChangeStatus() {
  return useDeskChange(
    (branchId, p: { id: number; status: BookingStatus; reason?: string }) =>
      api<Booking>(API_ENDPOINTS.BRANCH.BOOKING_STATUS(branchId, p.id), {
        method: "POST",
        body: { status: p.status, reason: p.reason ?? "" },
      }),
  )
}

export function useSetPayment() {
  return useDeskChange(
    (
      branchId,
      p: { id: number; status: "paid" | "unpaid"; method?: PaymentMethod },
    ) =>
      api<Booking>(API_ENDPOINTS.BRANCH.BOOKING_PAYMENT(branchId, p.id), {
        method: "POST",
        body: { status: p.status, method: p.method ?? "" },
      }),
  )
}

// ---------- restaurants: the group came in, other tables, a group without booking ----------

export function useMarkArrived() {
  return useDeskChange((branchId, id: number) =>
    api<Booking>(API_ENDPOINTS.BRANCH.BOOKING_ARRIVED(branchId, id), {
      method: "POST",
    }),
  )
}

export function useMoveTables() {
  return useDeskChange((branchId, p: { id: number; table_ids: number[] }) =>
    api<Booking>(API_ENDPOINTS.BRANCH.BOOKING_MOVE(branchId, p.id), {
      method: "POST",
      body: { table_ids: p.table_ids },
    }),
  )
}

export interface WalkInInput {
  table_ids: number[]
  guests: number
  name?: string
  phone?: string
  notes?: string
}

export function useWalkIn() {
  return useDeskChange((branchId, body: WalkInInput) =>
    api<Booking>(API_ENDPOINTS.BRANCH.WALK_INS(branchId), {
      method: "POST",
      body,
    }),
  )
}

// ---------- online payments (PhaJay): what was tried, what needs a person, refunds ----------

/** The online payment attempts of one booking */
export function useBookingPayments(bookingId: number) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("payments", bookingId),
    queryFn: () =>
      api<StaffPayment[]>(
        API_ENDPOINTS.BRANCH.BOOKING_PAYMENTS(branchId, bookingId),
      ),
  })
}

/** Money to give back, amounts that did not match, disputes and refunds in progress (managers) */
export function usePaymentsAttention() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("payments", "attention"),
    queryFn: () =>
      api<StaffPayment[]>(API_ENDPOINTS.BRANCH.PAYMENTS_ATTENTION(branchId)),
    refetchInterval: 60_000,
  })
}

export function useRefundPayment() {
  const { id: branchId, key } = useBiz()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<StaffPayment>(API_ENDPOINTS.BRANCH.PAYMENT_REFUND(branchId, id), {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key("payments") })
      void queryClient.invalidateQueries({ queryKey: key("bookings") })
    },
  })
}

/** The booking reports ask again every minute while the page is open (and the button asks at once) */
export const REPORT_REFRESH_MS = 60_000

/** The filters of the table and event booking reports (empty ones are left out) */
export type BookingRowsFilter = Record<string, string | number | undefined>

const clean = (f: BookingRowsFilter) =>
  Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v != null))

export function useTableReport(f: BookingRowsFilter) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("reports", "table-bookings", f),
    queryFn: () =>
      api<TableReport>(API_ENDPOINTS.BRANCH.REPORTS_TABLE_BOOKINGS(branchId), {
        query: clean(f),
      }),
    placeholderData: keepPreviousData,
    refetchInterval: REPORT_REFRESH_MS,
  })
}

export function useEventReport(f: BookingRowsFilter, enabled = true) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("reports", "event-bookings", f),
    queryFn: () =>
      api<EventReport>(API_ENDPOINTS.BRANCH.REPORTS_EVENT_BOOKINGS(branchId), {
        query: clean(f),
      }),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: REPORT_REFRESH_MS,
  })
}

// ---------- restaurants: the team books tables for a customer who phoned ----------

/** The free times and tables of a day for a group, as the team sees them (kept tables included) */
export function useDeskTableAvailability(date: string, guests: number) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("table-availability", date, guests),
    queryFn: () =>
      api<TableAvailability>(
        API_ENDPOINTS.BRANCH.TABLE_AVAILABILITY(branchId),
        {
          query: { date, guests },
        },
      ),
    enabled: !!date && guests > 0,
    placeholderData: keepPreviousData,
  })
}

export interface ReserveTablesInput {
  table_ids: number[]
  guests: number
  starts_at: string
  guest: { name: string; phone: string }
  notes?: string
}

/** Book tables for a customer who phoned: confirmed at once */
export function useReserveTables() {
  return useDeskChange((branchId, body: ReserveTablesInput) =>
    api<Booking>(API_ENDPOINTS.BRANCH.BOOKINGS(branchId), {
      method: "POST",
      body,
    }),
  )
}
