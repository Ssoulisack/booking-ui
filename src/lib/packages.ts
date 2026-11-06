import type { TFunction } from "i18next"

import type {
  CustomerPackage,
  PackageCovers,
  PackageOption,
} from "@/lib/api/types"

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
  p: { covers: PackageCovers; resource_name: string },
) {
  return p.covers === "space"
    ? t("packages.coversSpace", { space: p.resource_name })
    : t("packages.coversClass")
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
