import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { ErrorAlert } from "@/components/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { roleAtLeast } from "@/lib/roles"

import { useSettings } from "./api"
import { useDashboard } from "./context"
import { PublishButton } from "./DashboardHome"
import { ShareBooking } from "./ShareBooking"
import { PageHeader, Panel } from "./ui"

/** /dashboard/:id/share — the booking page's link and QR code, a poster, chat buttons; Unpublish */
export function SharePage() {
  const { t } = useTranslation()
  const { branch } = useDashboard()
  const settings = useSettings()
  if (settings.isPending) return <Skeleton className="h-96 rounded-xl" />
  if (!settings.data) return <ErrorAlert error={settings.error} />
  const s = settings.data
  const url = `${window.location.origin}${s.public_path}`
  const isOwner = roleAtLeast(branch.role, "admin")

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("sharePage.title")} lead={t("sharePage.lead")} />
      {s.status === "published" ? (
        <Panel
          title={t("overview.liveTitle")}
          lead={t("overview.liveLead")}
          actions={
            <Badge className="border-0 bg-amber-200 text-amber-950 dark:bg-amber-400/25 dark:text-amber-100">
              {t("status.published")}
            </Badge>
          }
        >
          <ShareBooking url={url} name={s.name} />
          {isOwner && <PublishButton published />}
        </Panel>
      ) : (
        <Panel title={t("sharePage.notLive")}>
          <p className="mb-4 text-muted-foreground">
            {t("sharePage.notLiveLead")}
          </p>
          <Button asChild className="h-11 lg:h-9">
            <Link to={`/dashboard/${branch.branch_id}`}>
              {t("sharePage.toChecklist")}
            </Link>
          </Button>
        </Panel>
      )}
    </div>
  )
}
