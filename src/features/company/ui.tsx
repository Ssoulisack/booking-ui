import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { BranchStatus, PageMeta } from "@/lib/api/types"
import { cn } from "@/lib/utils"

const STATUS_STYLE: Record<BranchStatus, string> = {
  draft: "bg-muted text-foreground",
  published: "bg-emerald-100 text-emerald-900",
  closed: "bg-rose-100 text-rose-900",
}

export function StatusBadge({ status }: { status: BranchStatus }) {
  const { t } = useTranslation()
  return (
    <Badge className={cn("border-0", STATUS_STYLE[status])}>
      {t(`status.${status}`)}
    </Badge>
  )
}

/** Previous / next under a list; hidden when everything fits on one page */
export function Pager({
  meta,
  page,
  onPage,
}: {
  meta: PageMeta | undefined
  page: number
  onPage: (page: number) => void
}) {
  const { t } = useTranslation()
  if (!meta || meta.total_page <= 1) return null
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="mr-auto text-sm text-muted-foreground">
        {t("company.pageOf", { page, pages: meta.total_page })}
      </span>
      <Button
        variant="outline"
        className="h-11 lg:h-9"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {t("desk.previous")}
      </Button>
      <Button
        variant="outline"
        className="h-11 lg:h-9"
        disabled={page >= meta.total_page}
        onClick={() => onPage(page + 1)}
      >
        {t("desk.next")}
      </Button>
    </div>
  )
}
