import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import type { BranchStatus } from "@/lib/api/types"
import { cn } from "@/lib/utils"

const STATUS_STYLE: Record<BranchStatus, string> = {
  draft: "bg-muted text-foreground",
  published:
    "bg-emerald-100 dark:bg-emerald-400/20 text-emerald-900 dark:text-emerald-200",
  closed: "bg-rose-100 dark:bg-rose-400/20 text-rose-900 dark:text-rose-200",
}

export function StatusBadge({ status }: { status: BranchStatus }) {
  const { t } = useTranslation()
  return (
    <Badge className={cn("border-0", STATUS_STYLE[status])}>
      {t(`status.${status}`)}
    </Badge>
  )
}

/** The shared pager (first, previous, jump to a page, next, last): see components/Pager */
export { Pager } from "@/components/Pager"
