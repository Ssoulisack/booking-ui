import { QrCodeIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * The slim "live" bar at the top of an Overview: Published, the link, and a button to the Share
 * page (QR code, poster, chat buttons). The same on the branch and the company Overview.
 */
export function LiveStrip({ url, to }: { url: string; to: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex w-fit max-w-full flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-300 dark:bg-amber-400/15 dark:ring-amber-400/30">
      <Badge className="border-0 bg-amber-200 text-amber-950 dark:bg-amber-400/25 dark:text-amber-100">
        {t("status.published")}
      </Badge>
      <p className="max-w-[16rem] min-w-0 truncate text-sm text-amber-950 sm:max-w-sm dark:text-amber-100">
        {url}
      </p>
      <Button asChild variant="outline" className="h-11 lg:h-9">
        <Link to={to}>
          <QrCodeIcon />
          {t("overview.sharePage")}
        </Link>
      </Button>
    </div>
  )
}
