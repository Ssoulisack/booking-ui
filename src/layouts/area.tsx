import { Building2Icon, StoreIcon } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { cn } from "@/lib/utils"

import type { Area } from "./area-state"

const HOME: Record<Area, string> = { company: "/company", branch: "/dashboard" }
const ICON = { company: Building2Icon, branch: StoreIcon }

/**
 * "Company | Branch": the first thing in the owner's and admins' menu. The pill slides to the
 * choice first, then the other area opens.
 */
export function AreaSwitch({
  area,
  onNavigate,
}: {
  area: Area
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [picked, setPicked] = useState(area)

  const pick = (next: Area) => {
    if (next === picked) return
    setPicked(next)
    // let the pill finish its slide before the menu changes
    window.setTimeout(() => {
      onNavigate?.()
      navigate(HOME[next])
    }, 260)
  }

  return (
    <div className="px-3 pt-3">
      <p
        id="area-switch"
        className={cn(
          "mb-1.5 px-1 text-xs font-medium",
          area === "company" ? "text-white/60" : "text-muted-foreground",
        )}
      >
        {t("area.choose")}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="area-switch"
        className={cn(
          "grid grid-cols-2 gap-1 rounded-xl p-1",
          area === "company" ? "bg-white/10" : "bg-muted",
        )}
      >
        {(["company", "branch"] as const).map((a) => {
          const Icon = ICON[a]
          const on = a === picked
          return (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(a)}
              className={cn(
                "relative flex h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:h-9",
                on
                  ? a === "company"
                    ? "text-[var(--area-company-ink)]"
                    : "text-[var(--area-branch)]"
                  : area === "company"
                    ? "text-white/70 hover:text-white"
                    : "text-muted-foreground hover:text-foreground",
              )}
            >
              {on && (
                <motion.span
                  layoutId="area-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                />
              )}
              <Icon className="relative size-4" />
              <span className="relative">{t(`area.${a}`)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** A small coloured label in the top bar: which area this page belongs to */
export function AreaTag({ area }: { area: Area }) {
  const { t } = useTranslation()
  const Icon = ICON[area]
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold",
        area === "company"
          ? "bg-[var(--area-company-soft)] text-[var(--area-company-ink)]"
          : "bg-[var(--area-branch-soft)] text-[var(--area-branch-ink)]",
      )}
    >
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{t(`area.${area}`)}</span>
    </span>
  )
}
