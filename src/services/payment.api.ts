import { api } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { PayInfo, PaymentSettings } from "@/types/payment"

export const paymentService = {
  settings: (branchId: number) =>
    api<PaymentSettings>(API_ENDPOINTS.BRANCH.PAYMENT_SETTINGS(branchId)),
  payInfo: (branchId: number) =>
    api<PayInfo>(API_ENDPOINTS.BRANCH.EVENT_PAY(branchId)),
  savePayInfo: (branchId: number, body: PayInfo) =>
    api<PayInfo>(API_ENDPOINTS.BRANCH.EVENT_PAY(branchId), {
      method: "PUT",
      body,
    }),
  savePaymentSettings: (
    branchId: number,
    body: {
      online_enabled: boolean
      online_bookings?: boolean
      online_packages?: boolean
      charge_minutes: number
    },
  ) =>
    api<PaymentSettings>(API_ENDPOINTS.BRANCH.PAYMENT_SETTINGS(branchId), {
      method: "PUT",
      body,
    }),
}
