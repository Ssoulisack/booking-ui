import { api, apiPage, download } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  BookingRowsFilter,
  CashUp,
  EventReport,
  ReportKind,
  ReportOf,
  TableReport,
  UnpaidRow,
} from "@/types/report"

const clean = (f: BookingRowsFilter) =>
  Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v != null))

export const reportService = {
  report: <K extends ReportKind>(
    branchId: number,
    kind: K,
    from: string,
    to: string,
  ) =>
    api<ReportOf[K]>(API_ENDPOINTS.BRANCH.REPORT(branchId, kind), {
      query: { from, to },
    }),
  /** One page of the unpaid list (the server pages it; the CSV still has every row) */
  unpaid: (
    branchId: number,
    from: string,
    to: string,
    page: number,
    limit: number,
  ) =>
    apiPage<UnpaidRow>(API_ENDPOINTS.BRANCH.REPORTS_UNPAID(branchId), {
      query: { from, to, page, limit },
    }),
  cashUp: (branchId: number, date: string) =>
    api<CashUp>(API_ENDPOINTS.BRANCH.REPORTS_CASH_UP(branchId), {
      query: { date },
    }),
  tableBookings: (branchId: number, f: BookingRowsFilter) =>
    api<TableReport>(API_ENDPOINTS.BRANCH.REPORTS_TABLE_BOOKINGS(branchId), {
      query: clean(f),
    }),
  eventBookings: (branchId: number, f: BookingRowsFilter) =>
    api<EventReport>(API_ENDPOINTS.BRANCH.REPORTS_EVENT_BOOKINGS(branchId), {
      query: clean(f),
    }),
  /** Saves a report as CSV (utilisation, finance, unpaid, cash-up) */
  csv: (
    branchId: number,
    p: { report: string; query: Record<string, string>; filename: string },
  ) =>
    download(
      API_ENDPOINTS.BRANCH.REPORT(branchId, p.report),
      { query: { ...p.query, format: "csv" } },
      p.filename,
    ),
}
