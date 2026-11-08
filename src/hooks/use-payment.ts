import { useQuery } from "@tanstack/react-query"

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
