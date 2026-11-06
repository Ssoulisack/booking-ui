import { HistoryIcon, SlidersHorizontalIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import type { CustomerPackage } from "@/lib/api/types"
import { roleAtLeast } from "@/lib/roles"

import { useChange } from "../api"
import { useDashboard } from "../context"
import { packageApi } from "./api"
import {
  AdjustDialog,
  CancelPackage,
  MarkPaidDialog,
  VisitsDialog,
} from "./PackageDialogs"

/**
 * What the team can do with one customer package: mark it paid, adjust it (manager), see its history, cancel it
 * (manager). Used on the Customer packages table and in the Overview search.
 */
export function PackageActions({ pkg: p }: { pkg: CustomerPackage }) {
  const { t } = useTranslation()
  const { branch } = useDashboard()
  const canManage = roleAtLeast(branch.role, "manager")
  const [paying, setPaying] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [log, setLog] = useState(false)
  const cancel = useChange(packageApi.cancel, ["sold-packages"])
  const paid = p.payment_status === "paid"

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {!paid && p.status !== "cancelled" && (
        <Button size="sm" className="h-9" onClick={() => setPaying(true)}>
          {t("packages.markPaid")}
        </Button>
      )}
      {paid && p.status !== "cancelled" && canManage && (
        <Button
          size="sm"
          variant="outline"
          className="h-9 px-2.5"
          title={t("packages.adjust")}
          onClick={() => setAdjusting(true)}
        >
          <SlidersHorizontalIcon />
          <span className="sr-only">{t("packages.adjust")}</span>
        </Button>
      )}
      {paid && (
        <Button
          size="sm"
          variant="outline"
          className="h-9 px-2.5"
          title={t("packages.log")}
          onClick={() => setLog(true)}
        >
          <HistoryIcon />
          <span className="sr-only">{t("packages.log")}</span>
        </Button>
      )}
      {p.status !== "cancelled" && canManage && (
        <CancelPackage
          pkg={p}
          pending={cancel.isPending}
          onConfirm={() => cancel.mutate(p.id)}
        />
      )}
      <ErrorAlert error={cancel.error} />
      {paying && <MarkPaidDialog pkg={p} onClose={() => setPaying(false)} />}
      {adjusting && (
        <AdjustDialog pkg={p} onClose={() => setAdjusting(false)} />
      )}
      {log && <VisitsDialog pkg={p} onClose={() => setLog(false)} />}
    </div>
  )
}
