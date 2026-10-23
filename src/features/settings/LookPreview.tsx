import { StoreIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { brandStyle } from "@/features/public/brand"
import { BrandRings } from "@/features/public/BrandRings"
import type { Look } from "@/features/public/look"

/**
 * A small booking page that follows the choices on this settings page as they are made (rings,
 * fonts, brand colour): the hero with its rings, a button and a day picker. Nothing is saved
 * until the form is.
 */
export function LookPreview({
  name,
  brand,
  look,
}: {
  name: string
  brand: string
  look: Look
}) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t("look.previewTitle")}
      style={brandStyle(brand, look)}
      className="overflow-hidden rounded-xl bg-[#f3f5f4] text-[#141a17] ring-1 ring-border"
    >
      <div className="relative overflow-hidden bg-[var(--brand)] text-[var(--brand-foreground)]">
        <BrandRings brand={brand} colors={look.ring_colors} compact />
        <div className="relative space-y-3 px-4 py-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold tracking-wide uppercase ring-1 ring-white/25">
            <StoreIcon className="size-3.5" />
            {t("public.branch")}
          </span>
          <p className="display-tight text-4xl break-words">
            {name || t("look.sampleName")}
          </p>
          <span className="inline-flex h-10 items-center rounded-xl bg-white px-5 font-semibold text-[var(--brand-ink)]">
            {t("public.bookNow")}
          </span>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <p className="display-tight text-2xl">{t("look.sampleHeading")}</p>
        <p className="text-sm text-muted-foreground">{t("look.sampleBody")}</p>
        <div className="flex gap-2">
          {["Fri 23", "Sat 24", "Sun 25"].map((day, i) => (
            <span
              key={day}
              className={
                i === 0
                  ? "rounded-xl bg-[var(--brand)] px-3 py-2 text-sm font-medium text-[var(--brand-foreground)]"
                  : "rounded-xl bg-white px-3 py-2 text-sm font-medium ring-1 ring-black/10"
              }
            >
              {day}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
