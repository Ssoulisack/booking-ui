import { api } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { Booking } from "@/types/booking"
import type { CustomerPackage, SlipInput } from "@/types/package"
import type { OnlinePayment, PayWho } from "@/types/payment"

function slipForm(s: SlipInput) {
  const form = new FormData()
  form.set("via", s.via)
  if (s.file) form.set("slip", s.file, "slip.jpg")
  return form
}

/** "I paid and sent the slip": by the private link, or for a logged-in customer's own booking */
export const slipService = {
  guest: (slug: string, token: string, s: SlipInput = { via: "whatsapp" }) =>
    api<Booking>(API_ENDPOINTS.PUBLIC.BOOKING_SLIP_SENT(slug, token), {
      method: "POST",
      form: slipForm(s),
    }),
  mine: (id: number, s: SlipInput = { via: "whatsapp" }) =>
    api<Booking>(API_ENDPOINTS.ME.BOOKING_SLIP_SENT(id), {
      method: "POST",
      form: slipForm(s),
    }),
  /** the same for a package the customer bought */
  package: (id: number, s: SlipInput = { via: "whatsapp" }) =>
    api<CustomerPackage>(API_ENDPOINTS.ME.PACKAGE_SLIP(id), {
      method: "POST",
      form: slipForm(s),
    }),
}

/** Online payment of a booking, by its private link (guest) or as the logged-in customer */
export const payService = {
  start: (
    slug: string,
    who: PayWho,
    body: { provider: string; method: string },
  ) =>
    "packageId" in who
      ? api<OnlinePayment>(API_ENDPOINTS.ME.PACKAGE_PAY(who.packageId), {
          method: "POST",
          body,
        })
      : "token" in who
        ? api<OnlinePayment>(
            API_ENDPOINTS.PUBLIC.BOOKING_PAY(slug, who.token),
            { method: "POST", body },
          )
        : api<OnlinePayment>(API_ENDPOINTS.ME.BOOKING_PAY(who.bookingId), {
            method: "POST",
            body,
          }),
  /** the payment still open for this booking (same QR, time left), the one just paid, or null */
  open: (slug: string, who: PayWho) =>
    "packageId" in who
      ? api<OnlinePayment | null>(
          API_ENDPOINTS.ME.PACKAGE_PAYMENT(who.packageId),
        )
      : "token" in who
        ? api<OnlinePayment | null>(
            API_ENDPOINTS.PUBLIC.BOOKING_PAYMENT(slug, who.token),
          )
        : api<OnlinePayment | null>(
            API_ENDPOINTS.ME.BOOKING_PAYMENT(who.bookingId),
          ),
  check: (slug: string, who: PayWho, id: number) =>
    "packageId" in who
      ? api<OnlinePayment>(
          API_ENDPOINTS.ME.PACKAGE_PAYMENT_ONE(who.packageId, id),
        )
      : "token" in who
        ? api<OnlinePayment>(
            API_ENDPOINTS.PUBLIC.BOOKING_PAYMENT_ONE(slug, who.token, id),
          )
        : api<OnlinePayment>(
            API_ENDPOINTS.ME.BOOKING_PAYMENT_ONE(who.bookingId, id),
          ),
}
