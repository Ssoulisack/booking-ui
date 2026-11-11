import { HistoryIcon, RotateCwIcon, SlidersHorizontalIcon } from "lucide-react"
import { useCancelPackage } from "@/hooks/use-package"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { ErrorAlert } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import type { CustomerPackage } from "@/types/package"
import { roleAtLeast } from "@/lib/constants/roles"

import { useDashboard } from "@/components/provider/dashboard-context"
import {
  AdjustDialog,
  CancelPackage,
  MarkPaidDialog,
  VisitsDialog,
} from "./PackageDialogs"
import { SellDialog } from "./SellDialog"

/**
 * What the team can do with one customer package: mark it paid, adjust it (manager), see its history, renew it when
 * it is used up or out of time (sell the same again), cancel it (manager). Used on the Customer packages table and in the Overview search.
 */
export function PackageActions({ pkg: p }: { pkg: CustomerPackage }) {
  const { t } = useTranslation()
  const { branch } = useDashboard()
  const canManage = roleAtLeast(branch.role, "manager")
  const [paying, setPaying] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [log, setLog] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const cancel = useCancelPackage()
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
      {/* used up or out of time: sell the same package and option again to this customer */}
      {paid && (p.status === "used_up" || p.status === "expired") && (
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => setRenewing(true)}
        >
          <RotateCwIcon />
          {t("packages.renew")}
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
      {renewing && <SellDialog renew={p} onClose={() => setRenewing(false)} />}
    </div>
  )
}
