import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from "@tanstack/react-query"

import { api, apiPage } from "@/lib/api/client"
import type {
  Availability,
  Booking,
  ClassSession,
  CreateBookingInput,
  CreatedBooking,
  PublicBranch,
  PublicCoach,
  PublicResource,
  Sport,
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

/** The classes list on the branch page: six at a time, more as the list is scrolled */
export function useUpcomingClassPages(slug: string) {
  return useInfiniteQuery({
    queryKey: [...publicKeys.upcomingClasses(slug), "pages"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiPage<ClassSession>(`${pub(slug)}/class-sessions`, {
        query: { limit: CLASS_PAGE, page: pageParam },
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
