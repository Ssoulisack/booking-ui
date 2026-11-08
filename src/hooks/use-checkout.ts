import {
  useMutation,
  useQuery,
  type UseMutationOptions,
} from "@tanstack/react-query"

import { accountService } from "@/services/account.api"
import { payService, slipService } from "@/services/checkout.api"
import { publicService } from "@/services/public.api"
import type { Booking } from "@/types/booking"
import type { CustomerPackage, SlipInput } from "@/types/package"
import type { OnlinePayment, PayWho } from "@/types/payment"

type Options<Data, Vars> = Omit<
  UseMutationOptions<Data, Error, Vars>,
  "mutationFn"
>

/** "I paid and sent the slip" for a guest booking (private link) or a logged-in customer's booking */
export function useSendBookingSlip(
  target: { slug: string; token: string } | { bookingId: number },
  options?: Options<Booking, SlipInput>,
) {
  return useMutation({
    mutationFn: (input: SlipInput) =>
      "token" in target
        ? slipService.guest(target.slug, target.token, input)
        : slipService.mine(target.bookingId, input),
    ...options,
  })
}

/** The same for a package the customer bought */
export function useSendPackageSlip(
  packageId: number,
  options?: Options<CustomerPackage, SlipInput>,
) {
  return useMutation({
    mutationFn: (input: SlipInput) => slipService.package(packageId, input),
    ...options,
  })
}

/** The online payment still open for this booking or package (same QR, time left), the one just paid, or null */
export function useOpenPayment(
  slug: string,
  who: PayWho,
  cacheKey: string | number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["public", slug, "open-payment", cacheKey],
    queryFn: () => payService.open(slug, who),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
}

export function useStartPayment(
  slug: string,
  who: PayWho,
  options?: Options<OnlinePayment, { provider: string; method: string }>,
) {
  return useMutation({
    mutationFn: (p: { provider: string; method: string }) =>
      payService.start(slug, who, p),
    ...options,
  })
}

/** The page does not wait for the webhook: it asks every few seconds while the payment is open */
export function useCheckPayment(
  slug: string,
  who: PayWho,
  paymentId: number | undefined,
  pending: boolean,
) {
  return useQuery({
    queryKey: ["public", slug, "payment", paymentId],
    queryFn: () => payService.check(slug, who, paymentId!),
    enabled: pending,
    refetchInterval: 3000,
  })
}

/** "Start over" after the wrong bank: the booking or package is cancelled so the customer can begin again */
export function useStartOver(
  slug: string,
  who: PayWho,
  options?: Options<unknown, void>,
) {
  return useMutation<unknown, Error, void>({
    mutationFn: () =>
      "packageId" in who
        ? accountService.cancelPackage(who.packageId)
        : "token" in who
          ? publicService.cancelGuest(
              slug,
              who.token,
              "Customer started over (wrong bank)",
            )
          : accountService.cancelBooking(
              who.bookingId,
              "Customer started over (wrong bank)",
            ),
    ...options,
  })
}
