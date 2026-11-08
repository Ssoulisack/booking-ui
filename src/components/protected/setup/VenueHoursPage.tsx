import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/protected/branch/ui"
import { HoursEditor } from "./HoursEditor"

/** /setup/hours — a restaurant's opening hours: one week for the whole place, every table follows it */
export function VenueHoursPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("restaurant.hours.title")}
        lead={t("restaurant.hours.lead")}
      />
      <HoursEditor owner="venue" id={0} />
      <p className="mt-3 text-sm text-muted-foreground">
        {t("restaurant.hours.midnight")}
      </p>
    </div>
  )
}
