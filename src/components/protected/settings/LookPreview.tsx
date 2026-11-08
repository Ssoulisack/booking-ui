import { colord } from "colord"
import { MoonIcon, StoreIcon, SunIcon, TriangleAlertIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { brandStyle, heroIsDark } from "@/components/public/booking/brand"
import { BrandRings } from "@/components/public/booking/BrandRings"
import type { Look } from "@/components/public/booking/look"
import { cn } from "@/lib/utils"

const NAVY = "#0e1330"
const PAPER = "#f6f4ee"

/**
 * The booking page as customers will see it, in the light AND the dark theme side by side,
 * following the choices on this settings page as they are made (rings, fonts, brand colour).
 * Warns when the colour is hard to see in one of them. Nothing is saved until the form is.
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
  const valid = colord(brand).isValid()
  // too dark for navy: the dark theme gives buttons to candy yellow; too pale for paper: hard to see
  const darkSwap = valid && colord(brand).contrast(NAVY) < 3
  const lightPale = valid && colord(brand).contrast(PAPER) < 3
  return (
    <section aria-label={t("look.previewTitle")} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel name={name} brand={brand} look={look} mode="light" />
        <Panel name={name} brand={brand} look={look} mode="dark" />
      </div>
      {(darkSwap || lightPale) && (
        <ul className="space-y-1.5 text-sm">
          {darkSwap && (
            <li className="flex items-start gap-2 text-muted-foreground">
              <MoonIcon className="mt-0.5 size-4 shrink-0" />
              {t("look.darkSwap")}
            </li>
          )}
          {lightPale && (
            <li className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              {t("look.lightPale")}
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

function Panel({
  name,
  brand,
  look,
  mode,
}: {
  name: string
  brand: string
  look: Look
  mode: "light" | "dark"
}) {
  const { t } = useTranslation()
  const candy = heroIsDark(brand)
  return (
    <div
      style={brandStyle(brand, look, mode)}
      className={cn(
        "pub-preview overflow-hidden rounded-xl bg-background text-foreground ring-1 ring-border",
        mode === "dark" && "dark",
      )}
    >
      <p className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {mode === "dark" ? (
          <MoonIcon className="size-3.5" />
        ) : (
          <SunIcon className="size-3.5" />
        )}
        {t(`look.mode.${mode}`)}
      </p>
      <div className="relative overflow-hidden bg-[var(--brand-hero)] text-[var(--brand-hero-foreground)]">
        <BrandRings brand={brand} colors={look.ring_colors} compact />
        <div className="relative space-y-3 px-4 py-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold tracking-wide uppercase ring-1 ring-white/25">
            <StoreIcon className="size-3.5" />
            {t("public.branch")}
          </span>
          <p
            className={cn(
              "display-tight text-3xl break-words",
              candy && "text-[var(--candy-yellow)]",
            )}
          >
            {name || t("look.sampleName")}
          </p>
          <span className="inline-flex h-10 items-center rounded-full bg-[var(--candy-yellow)] px-5 font-bold text-[var(--candy-ink)]">
            {t("public.bookNow")}
          </span>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <p className="display-tight text-xl">
          <span className="candy-label [--candy:var(--candy-yellow)]">
            {t("look.sampleHeading")}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">{t("look.sampleBody")}</p>
        <div className="flex flex-wrap gap-2">
          {["Fri 23", "Sat 24", "Sun 25"].map((day, i) => (
            <span
              key={day}
              className={
                i === 0
                  ? "rounded-full bg-[var(--brand)] px-3 py-2 text-sm font-medium text-[var(--brand-foreground)]"
                  : "rounded-full bg-card px-3 py-2 text-sm font-medium ring-1 ring-border"
              }
            >
              {day}
            </span>
          ))}
        </div>
        <p className="text-sm font-medium text-[var(--brand-ink)]">
          {t("look.sampleLink")}
        </p>
      </div>
    </div>
  )
}
