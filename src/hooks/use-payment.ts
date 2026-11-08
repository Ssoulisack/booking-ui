import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useBiz, useChange } from "@/hooks/use-branch"
import { paymentService } from "@/services/payment.api"

export function usePaymentSettings() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("payment-settings"),
    queryFn: () => paymentService.settings(branchId),
    refetchOnWindowFocus: false,
  })
}

/** How customers pay for events: the bank details shown on the page */
export function usePayInfo() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("event-pay"),
    queryFn: () => paymentService.payInfo(branchId),
    refetchOnWindowFocus: false,
  })
}

export const useSavePayInfo = (refresh = ["event-pay"]) =>
  useChange(paymentService.savePayInfo, refresh)

export const useSavePaymentSettings = (refresh = ["payment-settings"]) =>
  useChange(paymentService.savePaymentSettings, refresh)

// ---------- online payments (PhaJay): what was tried, what needs a person, refunds ----------

/** The online payment attempts of one booking */
export function useBookingPayments(bookingId: number) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("payments", bookingId),
    queryFn: () => paymentService.forBooking(branchId, bookingId),
  })
}

/** Money to give back, amounts that did not match, disputes and refunds in progress (managers) */
export function usePaymentsAttention() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("payments", "attention"),
    queryFn: () => paymentService.attention(branchId),
    refetchInterval: 60_000,
  })
}

export function useRefundPayment() {
  const { id: branchId, key } = useBiz()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => paymentService.refund(branchId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key("payments") })
      void queryClient.invalidateQueries({ queryKey: key("bookings") })
    },
  })
}
