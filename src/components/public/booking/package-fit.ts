import { useMyPackages } from "@/hooks/use-account"
import { useSession } from "@/stores/session"
import type { Availability } from "@/types/public"
import type { CustomerPackage } from "@/types/package"

import { usePublic } from "./context"

/**
 * The customer's packages that can pay what is being chosen on the booking page: active, of this branch, still valid
 * on the day, and covering it (this space, or the group classes of this sport; a coach is allowed only when the
 * package includes coaches, see BookingPanel). Logged-in customers
 * only; a guest-only branch has none.
 */
export function useFitPackages(f: {
  what: "court" | "class" | "coach" | undefined
  sportId: number | undefined
  courtId: number | undefined
  date: string
}): CustomerPackage[] {
  const { slug, business } = usePublic()
  const user = useSession((s) => s.user)
  const on = !!user && business.booking_mode !== "guest"
  const mine = useMyPackages(on)
  if (!on) return []
  return (mine.data ?? []).filter((p) => {
    if (p.branch_slug !== slug || p.status !== "active") return false
    if (p.kind === "times" && p.times_left < 1) return false
    const last = p.kind === "months" ? p.ends_on : p.expires_on
    if (last && f.date > last) return false
    return f.what === "class"
      ? p.covers === "group_class" && p.sport_id === f.sportId
      : f.what === "court" &&
          p.covers === "space" &&
          p.resource_id === f.courtId
  })
}

/** The package that runs out first (one with no last day comes last): the one picked for the customer */
export function firstToEnd(list: CustomerPackage[]) {
  const last = (p: CustomerPackage) =>
    (p.kind === "months" ? p.ends_on : p.expires_on) || "9999-12-31"
  return [...list].sort((a, b) => last(a).localeCompare(last(b)))[0]
}

/**
 * The package chosen on the booking page: the one in the address (?pkg=), or none when the customer chose "without
 * package" (?pkg=0), else the one that runs out first
 */
export function chosenPackage(
  fits: CustomerPackage[],
  pkg: number | undefined,
): CustomerPackage | null {
  if (pkg === 0) return null
  return fits.find((p) => p.id === pkg) ?? firstToEnd(fits) ?? null
}

/**
 * The lengths a package can pay for a space: whole visits only (60 min per visit: 1 h, 2 h… up to the visits left);
 * any length when it has no minutes per visit, or is a months pass. The prices are left out: the package pays.
 */
export function fitAvailability(
  a: Availability,
  p: CustomerPackage | null,
): Availability {
  if (!p) return a
  const fits = (d: number) =>
    p.kind === "months" ||
    !p.minutes_per_visit ||
    (d % p.minutes_per_visit === 0 && d / p.minutes_per_visit <= p.times_left)
  return {
    ...a,
    prices: [],
    slots: a.slots
      .map((s) => ({ ...s, durations_min: s.durations_min.filter(fits) }))
      .filter((s) => s.durations_min.length > 0),
  }
}
