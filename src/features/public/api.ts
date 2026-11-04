import {
  useInfiniteQuery,
  keepPreviousData,
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import { api, apiPage } from "@/lib/api/client"
import type {
  Availability,
  Booking,
  ClassSession,
  CreateBookingInput,
  BuyEventTablesInput,
  CreatedBooking,
  OnlinePayment,
  PaymentOption,
  PublicArea,
  PublicBranch,
  PublicCoach,
  PublicEvent,
  PublicEventDetail,
  PublicResource,
  Sport,
  TableAvailability,
} from "@/lib/api/types"

const pub = (slug: string) => `/public/branches/${encodeURIComponent(slug)}`

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

export function usePublicBranch(slug: string) {
  return useQuery({
    queryKey: publicKeys.business(slug),
    queryFn: () => api<PublicBranch>(`${pub(slug)}/`),
    ...CATALOG,
  })
}

export function useSports(slug: string) {
  return useQuery({
    queryKey: publicKeys.sports(slug),
    queryFn: () => api<Sport[]>(`${pub(slug)}/sports`),
    ...CATALOG,
  })
}

export function useResources(slug: string) {
  return useQuery({
    queryKey: publicKeys.resources(slug),
    queryFn: () => api<PublicResource[]>(`${pub(slug)}/resources`),
    ...CATALOG,
  })
}

export function useCoaches(slug: string) {
  return useQuery({
    queryKey: publicKeys.coaches(slug),
    queryFn: () => api<PublicCoach[]>(`${pub(slug)}/coaches`),
    ...CATALOG,
  })
}

/** Classes on one day (YYYY-MM-DD, business time zone), with seats left */
export function useClassesOn(slug: string, date: string) {
  return useQuery({
    queryKey: publicKeys.classes(slug, date),
    queryFn: async () =>
      (
        await apiPage<ClassSession>(`${pub(slug)}/class-sessions`, {
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
        await apiPage<ClassSession>(`${pub(slug)}/class-sessions`, {
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
      apiPage<ClassSession>(`${pub(slug)}/class-sessions`, {
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
      api<Availability>(`${pub(slug)}/availability`, {
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
      api<CreatedBooking>(`${pub(slug)}/bookings`, { method: "POST", body }),
  })
}

export function useGuestBooking(slug: string, token: string) {
  return useQuery({
    queryKey: publicKeys.guestBooking(slug, token),
    queryFn: () =>
      api<Booking>(`${pub(slug)}/bookings/${encodeURIComponent(token)}`),
    retry: false,
  })
}

export const bookingApi = {
  /** a booking without its link: the code and the phone it was made with */
  find: (slug: string, code: string, phone: string) =>
    api<Booking>(`${pub(slug)}/bookings/find`, {
      method: "POST",
      body: { code, phone },
    }),
  cancelFound: (slug: string, code: string, phone: string, reason: string) =>
    api<Booking>(`${pub(slug)}/bookings/find/cancel`, {
      method: "POST",
      body: { code, phone, reason },
    }),
  cancelGuest: (slug: string, token: string, reason: string) =>
    api<Booking>(`${pub(slug)}/bookings/${encodeURIComponent(token)}/cancel`, {
      method: "POST",
      body: { reason },
    }),
  myBookings: (status?: string) =>
    apiPage<Booking>("/me/bookings", { query: { limit: 100, status } }),
  cancelMine: (id: number, reason: string) =>
    api<Booking>(`/me/bookings/${id}/cancel`, {
      method: "POST",
      body: { reason },
    }),
}

/** A restaurant's areas with their tables and objects, lowest floor first */
export function useFloorPlans(slug: string, enabled = true) {
  return useQuery({
    queryKey: publicKeys.floorPlans(slug),
    queryFn: () => api<PublicArea[]>(`${pub(slug)}/floor-plans`),
    enabled,
    ...CATALOG,
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
      api<TableAvailability>(`${pub(slug)}/table-availability`, {
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
    queryFn: () => api<PublicEvent[]>(`${pub(slug)}/events`),
    enabled,
    staleTime: 60_000,
  })
}

/** One event day: its tables with prices and what is already sold (refreshed often) */
export function useEventDetail(slug: string, id: number, date: string) {
  return useQuery({
    queryKey: publicKeys.event(slug, id, date),
    queryFn: () =>
      api<PublicEventDetail>(`${pub(slug)}/events/${id}`, {
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
      api<CreatedBooking>(`${pub(slug)}/events/${id}/bookings`, {
        method: "POST",
        body,
      }),
  })
}

/** "I paid and sent the slip": by the private link, or for a logged-in customer's own booking */
export const slipApi = {
  guest: (slug: string, token: string) =>
    api<Booking>(`${pub(slug)}/bookings/${encodeURIComponent(token)}/slip-sent`, {
      method: "POST",
    }),
  mine: (id: number) =>
    api<Booking>(`/me/bookings/${id}/slip-sent`, { method: "POST" }),
}

/** The ways to pay online at this branch (empty: online payment is off, pay at the place or by QR / transfer) */
export function usePaymentOptions(slug: string) {
  return useQuery({
    queryKey: ["public", slug, "payment-options"] as const,
    queryFn: () => api<PaymentOption[]>(`${pub(slug)}/payment-options`),
    staleTime: 5 * 60_000,
  })
}

/** Online payment of a booking, by its private link (guest) or as the logged-in customer */
export const payApi = {
  start: (
    slug: string,
    who: { token: string } | { bookingId: number },
    body: { provider: string; method: string },
  ) =>
    "token" in who
      ? api<OnlinePayment>(
          `${pub(slug)}/bookings/${encodeURIComponent(who.token)}/pay`,
          { method: "POST", body },
        )
      : api<OnlinePayment>(`/me/bookings/${who.bookingId}/pay`, {
          method: "POST",
          body,
        }),
  check: (
    slug: string,
    who: { token: string } | { bookingId: number },
    id: number,
  ) =>
    "token" in who
      ? api<OnlinePayment>(
          `${pub(slug)}/bookings/${encodeURIComponent(who.token)}/payments/${id}`,
        )
      : api<OnlinePayment>(`/me/bookings/${who.bookingId}/payments/${id}`),
}
