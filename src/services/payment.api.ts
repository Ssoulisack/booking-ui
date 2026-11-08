import { api } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { PayInfo, PaymentSettings, StaffPayment } from "@/types/payment"

export const paymentService = {
  /** The online payment attempts of one booking */
  forBooking: (branchId: number, bookingId: number) =>
    api<StaffPayment[]>(
      API_ENDPOINTS.BRANCH.BOOKING_PAYMENTS(branchId, bookingId),
    ),
  /** Money to give back, amounts that did not match, disputes and refunds in progress */
  attention: (branchId: number) =>
    api<StaffPayment[]>(API_ENDPOINTS.BRANCH.PAYMENTS_ATTENTION(branchId)),
  refund: (branchId: number, id: number) =>
    api<StaffPayment>(API_ENDPOINTS.BRANCH.PAYMENT_REFUND(branchId, id), {
      method: "POST",
    }),
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
