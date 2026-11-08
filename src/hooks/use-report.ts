import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"

import { useBiz } from "@/hooks/use-branch"
import { reportService } from "@/services/report.api"
import type { BookingRowsFilter, ReportKind } from "@/types/report"

/** The booking reports ask again every minute while the page is open (and the button asks at once) */
export const REPORT_REFRESH_MS = 60_000

export function useReport<K extends ReportKind>(
  kind: K,
  from: string,
  to: string,
) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("reports", kind, from, to),
    queryFn: () => reportService.report(branchId, kind, from, to),
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
    queryFn: () => reportService.unpaid(branchId, from, to, page, limit),
    placeholderData: keepPreviousData,
  })
}

export function useCashUp(date: string) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("cashup", date),
    queryFn: () => reportService.cashUp(branchId, date),
  })
}

export function useTableReport(f: BookingRowsFilter) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("reports", "table-bookings", f),
    queryFn: () => reportService.tableBookings(branchId, f),
    placeholderData: keepPreviousData,
    refetchInterval: REPORT_REFRESH_MS,
  })
}

export function useEventReport(f: BookingRowsFilter, enabled = true) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("reports", "event-bookings", f),
    queryFn: () => reportService.eventBookings(branchId, f),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: REPORT_REFRESH_MS,
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
    }) => reportService.csv(branchId, p),
  })
}
