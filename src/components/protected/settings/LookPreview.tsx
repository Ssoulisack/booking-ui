import { MoonIcon, StoreIcon, SunIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { brandStyle } from "@/components/public/booking/brand"
import type { Look } from "@/components/public/booking/look"
import { cn } from "@/lib/utils"

/**
 * The booking page as customers will see it, in the light AND the dark theme side by side, following the font
 * choices on this settings page as they are made (the colours are the app theme's). Nothing is saved until the
 * form is.
 */
export function LookPreview({ name, look }: { name: string; look: Look }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t("look.previewTitle")} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel name={name} look={look} mode="light" />
        <Panel name={name} look={look} mode="dark" />
      </div>
    </section>
  )
}

function Panel({
  name,
  look,
  mode,
}: {
  name: string
  look: Look
  mode: "light" | "dark"
}) {
  const { t } = useTranslation()
  return (
    <div
      style={brandStyle(look, mode)}
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
        <div className="relative space-y-3 px-4 py-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold tracking-wide uppercase ring-1 ring-white/25">
            <StoreIcon className="size-3.5" />
            {t("public.branch")}
          </span>
          <p
            className={cn(
              "display-tight text-3xl break-words",
              "text-[var(--candy-yellow)]",
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
