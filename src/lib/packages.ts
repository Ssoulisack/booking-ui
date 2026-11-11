import type { TFunction } from "i18next"

import type {
  CustomerPackage,
  PackageCovers,
  PackageOption,
} from "@/types/package"

/** "10 times" or "3 months" */
export function optionLabel(
  t: TFunction,
  o: Pick<PackageOption, "kind" | "amount">,
) {
  return t(`packages.option.${o.kind}`, { count: o.amount })
}

/** What a package covers, in words: "Group class" or "Space A" */
export function coversLabel(
  t: TFunction,
  p: {
    covers: PackageCovers
    resource_name: string
    class_names?: string[]
  },
) {
  if (p.covers === "space")
    return t("packages.coversSpace", { space: p.resource_name })
  return p.class_names?.length
    ? t("packages.coversClasses", { names: p.class_names.join(", ") })
    : t("packages.coversClass")
}

/** Does a group-class package pay this class? No list = every class of the sport; a list = those weekly classes only */
export function coversClassOf(
  p: { class_ids?: number[] },
  timetableId: number | null | undefined,
) {
  if (!p.class_ids?.length) return true
  return !!timetableId && p.class_ids.includes(timetableId)
}

/** What is left of a customer's package: "7 of 10 left" or "until 6 Dec" */
export function leftLabel(
  t: TFunction,
  p: Pick<CustomerPackage, "kind" | "times_left" | "amount" | "ends_on">,
  day: (ymd: string) => string,
) {
  return p.kind === "months"
    ? t("packages.untilDay", { day: day(p.ends_on) })
    : t("packages.timesLeft", { left: p.times_left, total: p.amount })
}

/** A date "2026-12-06" as "6 Dec 2026" */
export function ymdLabel(ymd: string) {
  if (!ymd) return ""
  return new Date(`${ymd}T12:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * How many visits a booking takes from a customer's package: a months pass none, a class seat one, a space booking
 * one per "minutes per visit" (one when not set). null: the length is not a whole number of visits, so the package
 * does not pay it (the customer pays). The server decides the same way.
 */
export function visitsFor(
  p: Pick<CustomerPackage, "kind" | "minutes_per_visit">,
  minutes: number | undefined,
  isClass = false,
): number | null {
  if (p.kind === "months") return 0
  if (isClass || !p.minutes_per_visit) return 1
  if (!minutes || minutes % p.minutes_per_visit !== 0) return null
  return minutes / p.minutes_per_visit
}

/**
 * The status words of a customer package: one waiting for payment whose slip was already sent (paid, the team checks
 * it) reads "Waiting for approval", not "Waiting for payment"
 */
export function statusLabel(
  t: TFunction,
  p: Pick<CustomerPackage, "status" | "slip_sent_at">,
) {
  return p.status === "pending_payment" && p.slip_sent_at
    ? t("packages.status.awaiting_approval")
    : t(`packages.status.${p.status}`)
}

/**
 * The package as it will be after this booking: a times package with the visits the booking takes already taken off
 * (60 min per visit: 1 h leaves 1 of 2, 2 h leaves 0 of 2). Unchanged for a months pass, or a length it cannot pay.
 */
export function afterBooking<
  P extends Pick<CustomerPackage, "kind" | "minutes_per_visit" | "times_left">,
>(p: P, minutes: number | undefined, isClass = false): P {
  if (p.kind !== "times") return p
  const need = visitsFor(p, minutes, isClass)
  if (need === null) return p
  return { ...p, times_left: Math.max(0, p.times_left - need) }
}

/** "Coach included: A, B" or, with more, "Coach included: A, B +8 more" (a long list does not fit on a card) */
export function coachesShort(t: TFunction, names: string[]) {
  return names.length <= 2
    ? t("packages.withCoaches", { names: names.join(", ") })
    : t("packages.withCoachesMore", {
        names: names.slice(0, 2).join(", "),
        count: names.length - 2,
      })
}
