import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  type UseMutationOptions,
} from "@tanstack/react-query"

import { useEffect, useState } from "react"

import { normalizePhone } from "@/lib/phone"
import { publicService } from "@/services/public.api"
import type {
  Booking,
  CreateBookingInput,
  CreatedBooking,
} from "@/types/booking"
import type { BuyEventTablesInput } from "@/types/event"
import type { AvailabilityQuery } from "@/types/public"

type Options<Data, Vars> = Omit<
  UseMutationOptions<Data, Error, Vars>,
  "mutationFn"
>

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
  coachAvailability: (slug: string, q: AvailabilityQuery) =>
    ["public", slug, "coach-availability", q] as const,
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
export const CATALOG = { staleTime: 5 * 60_000 }

export function usePublicBranch(slug: string, enabled = true) {
  return useQuery({
    queryKey: publicKeys.business(slug),
    queryFn: () => publicService.branch(slug),
    enabled,
    ...CATALOG,
  })
}

export function useSports(slug: string) {
  return useQuery({
    queryKey: publicKeys.sports(slug),
    queryFn: () => publicService.sports(slug),
    ...CATALOG,
  })
}

export function useResources(slug: string) {
  return useQuery({
    queryKey: publicKeys.resources(slug),
    queryFn: () => publicService.resources(slug),
    ...CATALOG,
  })
}

export function useCoaches(slug: string) {
  return useQuery({
    queryKey: publicKeys.coaches(slug),
    queryFn: () => publicService.coaches(slug),
    ...CATALOG,
  })
}

/** Classes on one day (YYYY-MM-DD, business time zone), with seats left */
export function useClassesOn(slug: string, date: string) {
  return useQuery({
    queryKey: publicKeys.classes(slug, date),
    queryFn: () => publicService.classesOn(slug, date),
    placeholderData: keepPreviousData,
  })
}

// classes per request on the branch page
const CLASS_PAGE = 6

/** The next classes, soonest first */
export function useUpcomingClasses(slug: string) {
  return useQuery({
    queryKey: publicKeys.upcomingClasses(slug),
    queryFn: () => publicService.upcomingClasses(slug, CLASS_PAGE),
  })
}

/** The "Coming up" list under the Group class tab: a page at a time, more as it is scrolled */
export function useUpcomingClassPages(slug: string) {
  return useInfiniteQuery({
    queryKey: [...publicKeys.upcomingClasses(slug), "pages"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => publicService.classPage(slug, pageParam, 20),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.total_page ? last.meta.page + 1 : undefined,
  })
}

export function useAvailability(slug: string, q: AvailabilityQuery | null) {
  return useQuery({
    queryKey: publicKeys.availability(slug, q ?? { date: "" }),
    queryFn: () => publicService.availability(slug, q!),
    enabled: !!q,
    // free times change as people book: refresh often, keep the old grid while loading
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  })
}

/** The coaches free with a space on a day (each with their times): the booking page offers those free at the time picked */
export function useCoachAvailability(
  slug: string,
  q: AvailabilityQuery | null,
) {
  return useQuery({
    queryKey: publicKeys.coachAvailability(slug, q ?? { date: "" }),
    queryFn: () => publicService.coachAvailability(slug, q!),
    enabled: !!q,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  })
}

/**
 * Whether the phone a guest typed already has an account (they are asked to log in). Asked once the phone is a full Lao
 * number and has stayed the same for a moment; null while unknown.
 */
export function usePhoneHasAccount(
  slug: string,
  phone: string,
  enabled = true,
) {
  const lao = normalizePhone(phone)
  const [settled, setSettled] = useState<string | null>(null)
  useEffect(() => {
    const id = setTimeout(() => setSettled(lao), 400)
    return () => clearTimeout(id)
  }, [lao])
  const q = useQuery({
    queryKey: ["public", slug, "phone-check", settled] as const,
    queryFn: () => publicService.phoneCheck(slug, settled!),
    enabled: enabled && !!settled && settled === lao,
    staleTime: 60_000,
    retry: false,
  })
  return enabled && lao && settled === lao
    ? (q.data?.has_account ?? null)
    : null
}

export function useCreateBooking(slug: string) {
  return useMutation({
    mutationFn: (body: CreateBookingInput) =>
      publicService.createBooking(slug, body),
  })
}

/** How often an open booking is asked again: quickly while it waits for the team or for money */
export const bookingRefetchMs = (b: Booking | undefined) => {
  if (!b || (b.status !== "pending" && b.status !== "confirmed")) return false
  return b.status === "pending" || b.payment_status === "unpaid"
    ? 5_000
    : 20_000
}

export function useGuestBooking(slug: string, token: string) {
  return useQuery({
    queryKey: publicKeys.guestBooking(slug, token),
    queryFn: () => publicService.guestBooking(slug, token),
    retry: false,
    // the team may approve or cancel it, a payment may arrive: keep asking while it is open
    refetchOnWindowFocus: true,
    refetchInterval: (q) => bookingRefetchMs(q.state.data),
  })
}

export function useFindBooking(
  slug: string,
  options?: Options<Booking, { code: string; phone: string }>,
) {
  return useMutation({
    mutationFn: (p: { code: string; phone: string }) =>
      publicService.findBooking(slug, p.code, p.phone),
    ...options,
  })
}

export function useCancelFoundBooking(
  slug: string,
  options?: Options<Booking, { code: string; phone: string; reason: string }>,
) {
  return useMutation({
    mutationFn: (p: { code: string; phone: string; reason: string }) =>
      publicService.cancelFound(slug, p.code, p.phone, p.reason),
    ...options,
  })
}

export function useCancelGuestBooking(
  slug: string,
  token: string,
  options?: Options<Booking, string>,
) {
  return useMutation({
    mutationFn: (reason: string) =>
      publicService.cancelGuest(slug, token, reason),
    ...options,
  })
}

/** A restaurant's areas with their tables and objects, lowest floor first */
export function useFloorPlans(slug: string, enabled = true) {
  return useQuery({
    queryKey: publicKeys.floorPlans(slug),
    queryFn: () => publicService.floorPlans(slug),
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
    queryFn: () => publicService.tableAvailability(slug, q!.date, q!.guests),
    enabled: !!q,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}

/** The published events of a restaurant (the ads); a draft or past event is not in the list */
export function useEvents(slug: string, enabled = true) {
  return useQuery({
    queryKey: publicKeys.events(slug),
    queryFn: () => publicService.events(slug),
    enabled,
    staleTime: 60_000,
  })
}

/** One event day: its tables with prices and what is already sold (refreshed often) */
export function useEventDetail(slug: string, id: number, date: string) {
  return useQuery({
    queryKey: publicKeys.event(slug, id, date),
    queryFn: () => publicService.eventDetail(slug, id, date),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    retry: false,
  })
}

export function useBuyEventTables(slug: string, id: number) {
  return useMutation({
    mutationFn: (body: BuyEventTablesInput) =>
      publicService.buyEventTables(slug, id, body),
  })
}

/** The ways to pay online at this branch (empty: online payment is off, pay at the place or by QR / transfer) */
export function usePaymentOptions(slug: string, forPackage = false) {
  return useQuery({
    queryKey: ["public", slug, "payment-options", forPackage] as const,
    queryFn: () => publicService.paymentOptions(slug, forPackage),
    staleTime: 5 * 60_000,
  })
}

/** How to pay the branch outside the system (QR, account, WhatsApp), for a page opened on any device */
export function usePublicPayInfo(slug: string, enabled = true) {
  return useQuery({
    queryKey: ["public", slug, "event-pay"] as const,
    queryFn: () => publicService.payInfo(slug),
    enabled,
    staleTime: 60_000,
  })
}

/** What the branch sells as passes: active packages with their options on sale */
export function usePublicPackages(slug: string, enabled = true) {
  return useQuery({
    queryKey: ["public", slug, "packages"] as const,
    queryFn: () => publicService.packages(slug),
    enabled,
    ...CATALOG,
  })
}

export function useBuyPackage(
  slug: string,
  options?: Options<
    Awaited<ReturnType<typeof publicService.buyPackage>>,
    { packageId: number; optionId: number }
  >,
) {
  return useMutation({
    mutationFn: (p: { packageId: number; optionId: number }) =>
      publicService.buyPackage(slug, p.packageId, p.optionId),
    ...options,
  })
}

// keep this import used even if no screen types a creation result directly
export type { CreatedBooking }
