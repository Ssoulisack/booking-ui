import { useTranslation } from "react-i18next"

import { duration } from "@/lib/format"
import { afterBooking, leftLabel, ymdLabel } from "@/lib/packages"
import { cn } from "@/lib/utils"
import type { CustomerPackage } from "@/types/package"

/**
 * "Pay with": the customer's packages that fit, and "Without package". With a package that counts visits by length,
 * a line says which lengths it pays (other lengths: book without package).
 */
export function PackageChoice({
  fits,
  chosen,
  minutes,
  isClass,
  onChange,
}: {
  fits: CustomerPackage[]
  chosen: CustomerPackage | null
  /** the length chosen for a space: what is left is shown as after this booking (1 h: 1 of 2, 2 h: 0 of 2) */
  minutes?: number
  isClass?: boolean
  /** a package id, or 0: without package */
  onChange: (pkg: number) => void
}) {
  const { t } = useTranslation()
  if (fits.length === 0) return null
  const items = [
    ...fits.map((p) => ({
      id: p.id,
      label: p.name,
      sub: leftLabel(t, afterBooking(p, minutes, isClass), ymdLabel),
    })),
    { id: 0, label: t("public.pkg.without"), sub: "" },
  ]
  const value = chosen?.id ?? 0
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">{t("public.pkg.title")}</h3>
      <div
        role="radiogroup"
        aria-label={t("public.pkg.title")}
        className="grid gap-2 sm:grid-cols-2"
      >
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={it.id === value}
            onClick={() => onChange(it.id)}
            className={cn(
              "flex min-h-12 flex-col items-start justify-center rounded-xl border px-4 py-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
              it.id === value
                ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
                : "border-border bg-card active:bg-[var(--brand-soft)]",
            )}
          >
            <span className="font-medium">{it.label}</span>
            {it.sub && <span className="text-xs opacity-80">{it.sub}</span>}
          </button>
        ))}
      </div>
      {chosen?.kind === "times" && chosen.minutes_per_visit > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("public.pkg.lengthHint", {
            length: duration(chosen.minutes_per_visit),
          })}
        </p>
      )}
    </section>
  )
}
