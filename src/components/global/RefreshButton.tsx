import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { RefreshCwIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useSettings } from "@/hooks/use-branch"
import { stampIn } from "@/lib/format"

/**
 * A "Refresh" button with the time of the last update. Nothing refreshes by itself: the team presses it to read the
 * newest data (a new booking, a payment) without reloading the whole page.
 */
export function RefreshButton({
  fetching,
  updatedAt,
  onRefresh,
}: {
  /** the data is being read now: the icon spins and the button waits */
  fetching: boolean
  /** when the data was read last (ms since 1970; 0 = not yet) */
  updatedAt: number
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  return (
    <div className="flex items-center gap-2">
      {updatedAt > 0 && (
        <span className="text-xs text-muted-foreground">
          {t("common.updatedAt", {
            time: stampIn(new Date(updatedAt).toISOString(), tz).slice(11),
          })}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        className="h-11 lg:h-9"
        disabled={fetching}
        onClick={onRefresh}
      >
        <RefreshCwIcon className={fetching ? "animate-spin" : ""} />
        {t("common.refresh")}
      </Button>
    </div>
  )
}

/** The same button for a page made of many parts (the overview): one press reads again everything the page shows */
export function RefreshPage() {
  const client = useQueryClient()
  const fetching = useIsFetching() > 0
  const [updatedAt, setUpdatedAt] = useState(() => Date.now())
  return (
    <RefreshButton
      fetching={fetching}
      updatedAt={updatedAt}
      onRefresh={() =>
        void client
          .refetchQueries({ type: "active" })
          .then(() => setUpdatedAt(Date.now()))
      }
    />
  )
}
