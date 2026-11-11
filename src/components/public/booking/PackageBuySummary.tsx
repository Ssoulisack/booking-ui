import { addDays, addMonths } from "date-fns"
import {
  CalendarClockIcon,
  ClockIcon,
  MapPinIcon,
  UserRoundIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { duration, money, todayIn } from "@/lib/format"
import {
  coversLabel,
  optionLabel,
  ymdLabel,
  coachesShort,
} from "@/lib/packages"
import type { PackageItem, PackageOption } from "@/types/package"

/** "YYYY-MM-DD" n days or months after today in the branch time zone */
const after = (tz: string, days: number, months = 0) => {
  const today = new Date(`${todayIn(tz)}T12:00:00`)
  const d = months ? addMonths(today, months) : addDays(today, days)
  return d.toISOString().slice(0, 10)
}

/**
 * What the customer is about to buy, in the "Buy this package?" popup: the name, the option and its price, what it
 * pays (a space, or the group classes), how long one visit is, and how long it lasts: "Use within 30 days: until
 * Dec 11, 2026 if paid today", "No expiry", or for a months pass "Unlimited visits until …". The days count from the
 * payment (the package starts when it is paid).
 */
export function PackageBuySummary({
  pkg,
  option,
  tz,
}: {
  pkg: PackageItem
  option: PackageOption
  tz: string
}) {
  const { t } = useTranslation()
  const lasts =
    option.kind === "months"
      ? t("packages.public.monthsUntil", {
          day: ymdLabel(after(tz, 0, option.amount)),
        })
      : option.valid_days > 0
        ? t("packages.public.validUntil", {
            count: option.valid_days,
            day: ymdLabel(after(tz, option.valid_days)),
          })
        : t("packages.public.noExpiry")
  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <div>
        <p className="font-semibold">{pkg.name}</p>
        <p className="text-sm text-muted-foreground">
          {optionLabel(t, option)}
        </p>
        <p className="display-tight text-2xl tabular-nums">
          {money(option.price, pkg.currency)}
        </p>
      </div>
      <ul className="space-y-1 text-sm">
        <li className="flex items-start gap-2">
          <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {coversLabel(t, pkg)}
        </li>
        {pkg.coach_names?.length > 0 && (
          <li className="flex items-start gap-2">
            <UserRoundIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {coachesShort(t, pkg.coach_names)}
          </li>
        )}
        {option.kind === "times" && option.minutes_per_visit > 0 && (
          <li className="flex items-start gap-2">
            <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {t("packages.perVisit", {
              length: duration(option.minutes_per_visit),
            })}
          </li>
        )}
        <li className="flex items-start gap-2">
          <CalendarClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            {lasts}
            {(option.kind === "months" || option.valid_days > 0) && (
              <span className="block text-xs text-muted-foreground">
                {t("packages.public.fromPayment")}
              </span>
            )}
          </span>
        </li>
      </ul>
    </div>
  )
}
