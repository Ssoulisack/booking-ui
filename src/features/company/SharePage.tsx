import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { ShareBooking } from "@/features/dashboard/ShareBooking"
import { PageHeader, Panel } from "@/features/dashboard/ui"

import { useCompany } from "./api"

/** /company/share — the home page's link and QR code, a poster, chat buttons */
export function CompanySharePage() {
  const { t } = useTranslation()
  const company = useCompany()
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("company.shareTitle")}
        lead={t("company.shareLead")}
      />
      <Panel
        title={t("company.homeLinkTitle")}
        lead={t("company.homeLinkLead")}
        actions={
          <Badge className="border-0 bg-amber-200 text-amber-950 dark:bg-amber-400/25 dark:text-amber-100">
            {t("status.published")}
          </Badge>
        }
      >
        <ShareBooking
          url={`${window.location.origin}/`}
          name={company.data?.name ?? ""}
        />
      </Panel>
    </div>
  )
}
