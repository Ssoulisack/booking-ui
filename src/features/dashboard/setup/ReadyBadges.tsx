import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import type { ScheduleOwner } from "@/types/schedule"
import { money } from "@/lib/format"

import { useReadiness } from "@/hooks/use-schedule"

export function ReadyBadges({
  owner,
  id,
  active,
}: {
  owner: ScheduleOwner
  id: number
  active: boolean
}) {
  const { t } = useTranslation()
  const r = useReadiness(owner, id)
  if (r.loading) return null
  return (
    <span className="flex flex-wrap gap-1.5">
      {!active && <Badge variant="secondary">{t("dash.hidden")}</Badge>}
      {!r.hasHours && (
        <Badge className="border-0 bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
          {t("setup.needsHours")}
        </Badge>
      )}
      {r.price ? (
        <Badge variant="outline">
          {t("public.perHour", {
            price: money(r.price.price_per_hour, r.price.currency),
          })}
        </Badge>
      ) : (
        <Badge className="border-0 bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
          {t("setup.needsPrice")}
        </Badge>
      )}
    </span>
  )
}
