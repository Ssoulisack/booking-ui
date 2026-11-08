import {
  useInfiniteQuery,
  keepPreviousData,
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import { api, apiPage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  Booking,
  CreateBookingInput,
  CreatedBooking,
} from "@/types/booking"
import type { ClassSession } from "@/types/class"
import type {
  BuyEventTablesInput,
  PublicEvent,
  PublicEventDetail,
} from "@/types/event"
import type { PublicArea, TableAvailability } from "@/types/floor-plan"
import type {
  CustomerPackage,
  PackageItem,
  PackageVisit,
  SlipWay,
} from "@/types/package"
import type {
  OnlinePayment,
  PaymentOption,
  PublicPayInfo,
} from "@/types/payment"
import type {
  Availability,
  PublicBranch,
  PublicCoach,
  PublicResource,
} from "@/types/public"
import type { Sport } from "@/types/sport"

export const publicKeys = {
  business: (slug: string) => ["public", slug] as const,
  sports: (slug: string) => ["public", slug, "sports"] as const,
  resources: (slug: string) => ["public", slug, "resources"] as const,
  coaches: (slug: string) => ["public", slug, "coaches"] as const,
  classes: (slug: string, date: string) =>
    ["public", slug, "classes", date] as const,
  upcomingClasses: (slug: string) => ["public", slug, "classes"] as const,
  availability: (slug: string, q: AvailabilityQuery) =>
    ["public", slug, "availability", q] as const,
  events: (slug: string) => ["public", slug, "events"] as const,
  event: (slug: string, id: number, date: string) =>
    ["public", slug, "events", id, date] as const,
  floorPlans: (slug: string) => ["public", slug, "floor-plans"] as const,
  tableAvailability: (slug: string, date: string, guests: number) =>
    ["public", slug, "table-availability", date, guests] as const,
  guestBooking: (slug: string, token: string) =>
    ["public", slug, "booking", token] as const,
  myBookings: ["me", "bookings"] as const,
}

// the catalog changes rarely: keep it a few minutes
const CATALOG = { staleTime: 5 * 60_000 }

export function usePublicBranch(slug: string, enabled = true) {
  return useQuery({
    queryKey: publicKeys.business(slug),
    queryFn: () => api<PublicBranch>(API_ENDPOINTS.PUBLIC.ROOT(slug)),
    enabled,
    ...CATALOG,
  })
}

export function useSports(slug: string) {
  return useQuery({
    queryKey: publicKeys.sports(slug),
    queryFn: () => api<Sport[]>(API_ENDPOINTS.PUBLIC.SPORTS(slug)),
    ...CATALOG,
  })
}

export function useResources(slug: string) {
  return useQuery({
    queryKey: publicKeys.resources(slug),
    queryFn: () => api<PublicResource[]>(API_ENDPOINTS.PUBLIC.RESOURCES(slug)),
    ...CATALOG,
  })
}

export function useCoaches(slug: string) {
  return useQuery({
    queryKey: publicKeys.coaches(slug),
    queryFn: () => api<PublicCoach[]>(API_ENDPOINTS.PUBLIC.COACHES(slug)),
    ...CATALOG,
  })
}

/** Classes on one day (YYYY-MM-DD, business time zone), with seats left */
export function useClassesOn(slug: string, date: string) {
  return useQuery({
    queryKey: publicKeys.classes(slug, date),
    queryFn: async () =>
      (
        await apiPage<ClassSession>(API_ENDPOINTS.PUBLIC.CLASS_SESSIONS(slug), {
          query: { date, limit: 100 },
        })
      ).items,
    placeholderData: keepPreviousData,
  })
}

/** The next classes, soonest first */
// classes per request on the branch page
const CLASS_PAGE = 6

export function useUpcomingClasses(slug: string) {
  return useQuery({
    queryKey: publicKeys.upcomingClasses(slug),
    queryFn: async () =>
      (
        await apiPage<ClassSession>(API_ENDPOINTS.PUBLIC.CLASS_SESSIONS(slug), {
          query: { limit: CLASS_PAGE },
        })
      ).items,
  })
}

/** The "Coming up" list under the Group class tab: a page at a time, more as it is scrolled */
export function useUpcomingClassPages(slug: string) {
  return useInfiniteQuery({
    queryKey: [...publicKeys.upcomingClasses(slug), "pages"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiPage<ClassSession>(API_ENDPOINTS.PUBLIC.CLASS_SESSIONS(slug), {
        query: { limit: 20, page: pageParam },
      }),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.total_page ? last.meta.page + 1 : undefined,
  })
}

export interface AvailabilityQuery {
  date: string
  resource_id?: number
  coach_id?: number
  sport_id?: number
}

export function useAvailability(slug: string, q: AvailabilityQuery | null) {
  return useQuery({
    queryKey: publicKeys.availability(slug, q ?? { date: "" }),
    queryFn: () =>
      api<Availability>(API_ENDPOINTS.PUBLIC.AVAILABILITY(slug), {
        query: { ...q },
      }),
    enabled: !!q,
    // free times change as people book: refresh often, keep the old grid while loading
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  })
}

export function useCreateBooking(slug: string) {
  return useMutation({
    mutationFn: (body: CreateBookingInput) =>
      api<CreatedBooking>(API_ENDPOINTS.PUBLIC.BOOKINGS(slug), {
        method: "POST",
        body,
      }),
  })
}

export function useGuestBooking(slug: string, token: string) {
  return useQuery({
    queryKey: publicKeys.guestBooking(slug, token),
    queryFn: () => api<Booking>(API_ENDPOINTS.PUBLIC.BOOKING(slug, token)),
    retry: false,
    // the team may approve or cancel it, a payment may arrive: keep asking while it is open
    refetchOnWindowFocus: true,
    refetchInterval: (q) => {
      const b = q.state.data
      if (!b || (b.status !== "pending" && b.status !== "confirmed"))
        return false
      return b.status === "pending" || b.payment_status === "unpaid"
        ? 5_000
        : 20_000
    },
  })
}

/** A logged-in customer's own booking, kept up to date while it is open (the team may approve or cancel it) */
export function useMyBooking(id: number) {
  return useQuery({
    queryKey: ["me", "bookings", "one", id] as const,
    queryFn: () => api<Booking>(API_ENDPOINTS.ME.BOOKING(id)),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (q) => {
      const b = q.state.data
      if (!b || (b.status !== "pending" && b.status !== "confirmed"))
        return false
      return b.status === "pending" || b.payment_status === "unpaid"
        ? 5_000
        : 20_000
    },
  })
}

export const bookingApi = {
  /** a booking without its link: the code and the phone it was made with */
  find: (slug: string, code: string, phone: string) =>
    api<Booking>(API_ENDPOINTS.PUBLIC.BOOKINGS_FIND(slug), {
      method: "POST",
      body: { code, phone },
    }),
  cancelFound: (slug: string, code: string, phone: string, reason: string) =>
    api<Booking>(API_ENDPOINTS.PUBLIC.BOOKINGS_FIND_CANCEL(slug), {
      method: "POST",
      body: { code, phone, reason },
    }),
  cancelGuest: (slug: string, token: string, reason: string) =>
    api<Booking>(API_ENDPOINTS.PUBLIC.BOOKING_CANCEL(slug, token), {
      method: "POST",
      body: { reason },
    }),
  myBookings: (status?: string) =>
    apiPage<Booking>(API_ENDPOINTS.ME.BOOKINGS, {
      query: { limit: 100, status },
    }),
  /** add a booking made as a guest to this account: it must have been made with the phone on the account */
  claim: (code: string) =>
    api<Booking>(API_ENDPOINTS.ME.BOOKINGS_CLAIM, {
      method: "POST",
      body: { code },
    }),
  cancelMine: (id: number, reason: string) =>
    api<Booking>(API_ENDPOINTS.ME.BOOKING_CANCEL(id), {
      method: "POST",
      body: { reason },
    }),
}

/** A restaurant's areas with their tables and objects, lowest floor first */
export function useFloorPlans(slug: string, enabled = true) {
  return useQuery({
    queryKey: publicKeys.floorPlans(slug),
    queryFn: () => api<PublicArea[]>(API_ENDPOINTS.PUBLIC.FLOOR_PLANS(slug)),
    enabled,
    // the plan says which tables are kept for walk-ins: that changes while a customer has the page open, and the list
    // of free tables is refreshed every 15 s, so a longer cache would draw a kept table as "taken"
    staleTime: 20_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  })
}

/** The free times of a day for a group, with the free tables at each (refreshed often) */
export function useTableAvailability(
  slug: string,
  q: { date: string; guests: number } | null,
) {
  return useQuery({
    queryKey: publicKeys.tableAvailability(slug, q?.date ?? "", q?.guests ?? 0),
    queryFn: () =>
      api<TableAvailability>(API_ENDPOINTS.PUBLIC.TABLE_AVAILABILITY(slug), {
        query: { date: q!.date, guests: q!.guests },
      }),
    enabled: !!q,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}

/** The published events of a restaurant (the ads); a draft or past event is not in the list */
export function useEvents(slug: string, enabled = true) {
  return useQuery({
    queryKey: publicKeys.events(slug),
    queryFn: () => api<PublicEvent[]>(API_ENDPOINTS.PUBLIC.EVENTS(slug)),
    enabled,
    staleTime: 60_000,
  })
}

/** One event day: its tables with prices and what is already sold (refreshed often) */
export function useEventDetail(slug: string, id: number, date: string) {
  return useQuery({
    queryKey: publicKeys.event(slug, id, date),
    queryFn: () =>
      api<PublicEventDetail>(API_ENDPOINTS.PUBLIC.EVENT(slug, id), {
        query: date ? { date } : undefined,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    retry: false,
  })
}

export function useBuyEventTables(slug: string, id: number) {
  return useMutation({
    mutationFn: (body: BuyEventTablesInput) =>
      api<CreatedBooking>(API_ENDPOINTS.PUBLIC.EVENT_BOOKINGS(slug, id), {
        method: "POST",
        body,
      }),
  })
}

/** What a customer sends with "I paid": on WhatsApp (nothing to upload) or the slip picture (goes to the team's Telegram group) */
export interface SlipInput {
  via: SlipWay
  file?: Blob
}

function slipForm(s: SlipInput) {
  const form = new FormData()
  form.set("via", s.via)
  if (s.file) form.set("slip", s.file, "slip.jpg")
  return form
}

/** "I paid and sent the slip": by the private link, or for a logged-in customer's own booking */
export const slipApi = {
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

/** The ways to pay online at this branch (empty: online payment is off, pay at the place or by QR / transfer) */
export function usePaymentOptions(slug: string, forPackage = false) {
  return useQuery({
    queryKey: ["public", slug, "payment-options", forPackage] as const,
    queryFn: () =>
      api<PaymentOption[]>(API_ENDPOINTS.PUBLIC.PAYMENT_OPTIONS(slug), {
        query: forPackage ? { for: "package" } : undefined,
      }),
    staleTime: 5 * 60_000,
  })
}

/** Online payment of a booking, by its private link (guest) or as the logged-in customer */
export const payApi = {
  start: (
    slug: string,
    who: { token: string } | { bookingId: number } | { packageId: number },
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
  open: (
    slug: string,
    who: { token: string } | { bookingId: number } | { packageId: number },
  ) =>
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
  check: (
    slug: string,
    who: { token: string } | { bookingId: number } | { packageId: number },
    id: number,
  ) =>
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

/** How to pay the branch outside the system (QR, account, WhatsApp), for a page opened on any device */
export function usePublicPayInfo(slug: string, enabled = true) {
  return useQuery({
    queryKey: ["public", slug, "event-pay"] as const,
    queryFn: () => api<PublicPayInfo>(API_ENDPOINTS.PUBLIC.EVENT_PAY(slug)),
    enabled,
    staleTime: 60_000,
  })
}

// ---------- packages (course passes) ----------

export const packageKeys = {
  mine: ["me", "packages"] as const,
  list: (slug: string) => ["public", slug, "packages"] as const,
}

/** What the branch sells as passes: active packages with their options on sale */
export function usePublicPackages(slug: string, enabled = true) {
  return useQuery({
    queryKey: packageKeys.list(slug),
    queryFn: () => api<PackageItem[]>(API_ENDPOINTS.PUBLIC.PACKAGES(slug)),
    enabled,
    ...CATALOG,
  })
}

/** Everything the logged-in customer bought, at every branch; kept fresh while one waits for payment */
export function useMyPackages(enabled = true) {
  return useQuery({
    queryKey: packageKeys.mine,
    queryFn: () => api<CustomerPackage[]>(API_ENDPOINTS.ME.PACKAGES),
    enabled,
    refetchOnWindowFocus: true,
    refetchInterval: (q) =>
      q.state.data?.some((p) => p.status === "pending_payment")
        ? 10_000
        : false,
  })
}

export function useMyPackageVisits(id: number | null) {
  return useQuery({
    queryKey: [...packageKeys.mine, "visits", id] as const,
    queryFn: () =>
      api<PackageVisit[]>(API_ENDPOINTS.ME.PACKAGE_VISITS(id as number)),
    enabled: id !== null,
  })
}

export const myPackageApi = {
  buy: (slug: string, packageId: number, optionId: number) =>
    api<CustomerPackage>(API_ENDPOINTS.PUBLIC.PACKAGE_BUY(slug, packageId), {
      method: "POST",
      body: { option_id: optionId },
    }),
  cancel: (id: number) =>
    api<CustomerPackage>(API_ENDPOINTS.ME.PACKAGE_CANCEL(id), {
      method: "POST",
    }),
}
