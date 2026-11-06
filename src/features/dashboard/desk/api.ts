import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { api, apiPage, download } from "@/lib/api/client"
import type {
  Availability,
  Booking,
  BookingsReport,
  BookingStatus,
  Calendar,
  CashUp,
  Customer,
  CustomerMatch,
  Finance,
  PaymentMethod,
  StaffPayment,
  StaffBookingInput,
  UnpaidRow,
  Transactions,
  Utilisation,
  EventReport,
  TableReport,
} from "@/lib/api/types"

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
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("bookings", q),
    queryFn: () => apiPage<Booking>(`${base}/bookings`, { query: { ...q } }),
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
      apiPage<Booking>(`/branches/${branchId}/bookings`, {
        query: { status: "pending", limit: 1 },
      }),
    select: (page) => page.meta.total,
    enabled: branchId !== undefined,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useBooking(id: number | null) {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("booking", id),
    queryFn: () => api<Booking>(`${base}/bookings/${id}`),
    enabled: !!id,
  })
}

/** Courts and coaches side by side, `days` days from `date` (1 to 7) */
export function useCalendar(date: string, days: number) {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("calendar", date, days),
    queryFn: () => api<Calendar>(`${base}/calendar`, { query: { date, days } }),
    placeholderData: keepPreviousData,
    // the desk screen stays open all day: pick up online bookings
    refetchInterval: 60_000,
  })
}

/** Whose account is it? By phone, customer number (CNO000042) or email — shown before booking for it */
export function useFindCustomer() {
  const { base } = useBiz()
  return useMutation({
    mutationFn: (q: string) =>
      api<CustomerMatch>(`${base}/customers/find`, { query: { q } }),
  })
}

export function useCustomers(keyword: string, page: number) {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("customers", keyword, page),
    queryFn: () =>
      apiPage<Customer>(`${base}/customers`, {
        query: { keyword, page, limit: 30 },
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
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("availability", q),
    queryFn: () =>
      api<Availability>(`${base}/availability`, { query: { ...q } }),
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
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("reports", kind, from, to),
    queryFn: () =>
      api<ReportOf[K]>(`${base}/reports/${kind}`, { query: { from, to } }),
    placeholderData: keepPreviousData,
  })
}

export function useCashUp(date: string) {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("cashup", date),
    queryFn: () => api<CashUp>(`${base}/reports/cash-up`, { query: { date } }),
  })
}

/** Saves a report as CSV (utilisation, finance, unpaid, cash-up) */
export function useCsv() {
  const { base } = useBiz()
  return useMutation({
    mutationFn: (p: {
      path: string
      query: Record<string, string>
      filename: string
    }) =>
      download(
        `${base}${p.path}`,
        { query: { ...p.query, format: "csv" } },
        p.filename,
      ),
  })
}

// ---------- changes at the desk: every screen that shows bookings or money refreshes ----------

function useDeskChange<I>(fn: (base: string, input: I) => Promise<Booking>) {
  const { base, key } = useBiz()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: I) => fn(base, input),
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
  return useDeskChange((base, body: StaffBookingInput) =>
    api<Booking>(`${base}/bookings`, { method: "POST", body }),
  )
}

export function useChangeStatus() {
  return useDeskChange(
    (base, p: { id: number; status: BookingStatus; reason?: string }) =>
      api<Booking>(`${base}/bookings/${p.id}/status`, {
        method: "POST",
        body: { status: p.status, reason: p.reason ?? "" },
      }),
  )
}

export function useSetPayment() {
  return useDeskChange(
    (
      base,
      p: { id: number; status: "paid" | "unpaid"; method?: PaymentMethod },
    ) =>
      api<Booking>(`${base}/bookings/${p.id}/payment`, {
        method: "POST",
        body: { status: p.status, method: p.method ?? "" },
      }),
  )
}

// ---------- restaurants: the group came in, other tables, a group without booking ----------

export function useMarkArrived() {
  return useDeskChange((base, id: number) =>
    api<Booking>(`${base}/bookings/${id}/arrived`, { method: "POST" }),
  )
}

export function useMoveTables() {
  return useDeskChange((base, p: { id: number; table_ids: number[] }) =>
    api<Booking>(`${base}/bookings/${p.id}/move`, {
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
  return useDeskChange((base, body: WalkInInput) =>
    api<Booking>(`${base}/walk-ins`, { method: "POST", body }),
  )
}

// ---------- online payments (PhaJay): what was tried, what needs a person, refunds ----------

/** The online payment attempts of one booking */
export function useBookingPayments(bookingId: number) {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("payments", bookingId),
    queryFn: () =>
      api<StaffPayment[]>(`${base}/bookings/${bookingId}/payments`),
  })
}

/** Money to give back, amounts that did not match, disputes and refunds in progress (managers) */
export function usePaymentsAttention() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("payments", "attention"),
    queryFn: () => api<StaffPayment[]>(`${base}/payments/attention`),
    refetchInterval: 60_000,
  })
}

export function useRefundPayment() {
  const { base, key } = useBiz()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api<StaffPayment>(`${base}/payments/${id}/refund`, { method: "POST" }),
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
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("reports", "table-bookings", f),
    queryFn: () =>
      api<TableReport>(`${base}/reports/table-bookings`, { query: clean(f) }),
    placeholderData: keepPreviousData,
    refetchInterval: REPORT_REFRESH_MS,
  })
}

export function useEventReport(f: BookingRowsFilter, enabled = true) {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("reports", "event-bookings", f),
    queryFn: () =>
      api<EventReport>(`${base}/reports/event-bookings`, { query: clean(f) }),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: REPORT_REFRESH_MS,
  })
}
