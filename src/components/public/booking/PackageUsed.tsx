import { TicketIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { useMyPackages } from "@/hooks/use-account"
import { leftLabel, visitsFor, ymdLabel } from "@/lib/packages"
import type { Booking } from "@/types/booking"

/**
 * After booking with a package: which package paid, what this booking used and what is left now (read from the
 * customer's packages, so it is the count after this booking), with a link to My packages.
 */
export function PackageUsed({ booking: b }: { booking: Booking }) {
  const { t } = useTranslation()
  const mine = useMyPackages(!!b.customer_package_id)
  if (!b.customer_package_id) return null
  const p = mine.data?.find((x) => x.id === b.customer_package_id)
  const isClass = b.items.some((i) => i.kind === "class_session")
  const minutes = Math.round(
    (Date.parse(b.ends_at) - Date.parse(b.starts_at)) / 60_000,
  )
  return (
    <section className="space-y-1 rounded-xl border border-[var(--brand)] bg-card p-4 text-sm">
      <p className="flex flex-wrap items-center gap-x-2 font-medium">
        <TicketIcon className="size-4 shrink-0" />
        {t("public.pkg.paidWith", { name: p?.name ?? b.package ?? "" })}
        <span className="font-mono text-xs text-muted-foreground">
          {b.package_code}
        </span>
      </p>
      {p && (
        <>
          <p className="text-muted-foreground">
            {p.kind === "times"
              ? `${t("public.pkg.used", { count: visitsFor(p, minutes, isClass) ?? 1 })} · ${t("public.pkg.leftNow", { left: leftLabel(t, p, ymdLabel) })}`
              : leftLabel(t, p, ymdLabel)}
          </p>
          {p.kind === "times" && p.expires_on && (
            <p className="text-muted-foreground">
              {t("packages.useBy", { day: ymdLabel(p.expires_on) })}
            </p>
          )}
        </>
      )}
      <Link
        to="/account/packages"
        className="inline-flex min-h-11 items-center font-semibold text-[var(--brand-ink)] underline-offset-4 hover:underline"
      >
        {t("packages.my.title")}
      </Link>
    </section>
  )
}
