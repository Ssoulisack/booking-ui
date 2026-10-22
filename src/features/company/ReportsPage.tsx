import { useState } from "react"
import { useTranslation } from "react-i18next"

import { PageError } from "@/components/page-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader, Panel } from "@/features/dashboard/ui"
import type { FinanceTotals } from "@/lib/api/types"
import { money } from "@/lib/format"

import { useCompany, useCompanyReport } from "./api"
import { thisMonth } from "./period"
import { paginate } from "./paging"
import { Pager, StatusBadge } from "./ui"

/** /company/reports — every branch added up for a period, with one row per branch */
export function ReportsPage() {
  const { t } = useTranslation()
  const tz = useCompany().data?.timezone ?? "Asia/Vientiane"
  const [period, setPeriod] = useState(() => thisMonth(tz))
  const report = useCompanyReport(period)
  const [page, setPage] = useState(1)
  const rows = paginate(report.data?.branches ?? [], page)

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.reports")} lead={t("company.reportsLead")} />
      <div className="flex flex-wrap items-end gap-3">
        {(["from", "to"] as const).map((k) => (
          <div key={k} className="space-y-1.5">
            <Label htmlFor={`period-${k}`}>{t(`company.${k}`)}</Label>
            <Input
              id={`period-${k}`}
              type="date"
              value={period[k]}
              onChange={(e) => {
                if (!e.target.value) return
                setPeriod({ ...period, [k]: e.target.value })
                setPage(1)
              }}
              className="h-11 w-44 text-base lg:h-9 lg:text-sm"
            />
          </div>
        ))}
      </div>
      {report.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : report.isError ? (
        <PageError error={report.error} onRetry={() => report.refetch()} />
      ) : (
        <>
          <Panel title={t("company.allBranches")}>
            <p className="mb-3 text-sm text-muted-foreground">
              {t("company.bookingsCount", { count: report.data.bookings })}
            </p>
            <MoneyTable totals={report.data.totals} />
          </Panel>
          <Panel title={t("company.perBranch")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">
                      {t("company.branch")}
                    </th>
                    <th className="py-2 pr-3 text-right font-medium">
                      {t("company.bookings")}
                    </th>
                    <th className="py-2 pr-3 text-right font-medium">
                      {t("company.bookedValue")}
                    </th>
                    <th className="py-2 pr-3 text-right font-medium">
                      {t("company.paid")}
                    </th>
                    <th className="py-2 text-right font-medium">
                      {t("company.outstanding")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.items.map((b) => (
                    <tr key={b.branch_id}>
                      <td className="py-2 pr-3">
                        <span className="mr-2 font-medium">{b.name}</span>
                        {b.status !== "published" && (
                          <StatusBadge status={b.status} />
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {b.bookings}
                      </td>
                      {(["booked_value", "paid", "outstanding"] as const).map(
                        (k) => (
                          <td
                            key={k}
                            className="py-2 pr-3 text-right tabular-nums last:pr-0"
                          >
                            {b.totals.length === 0
                              ? "–"
                              : b.totals
                                  .map((m) => money(m[k], m.currency))
                                  .join(" · ")}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <Pager meta={rows.meta} page={rows.page} onPage={setPage} />
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}

function MoneyTable({ totals }: { totals: FinanceTotals[] }) {
  const { t } = useTranslation()
  if (totals.length === 0) {
    return <p className="text-muted-foreground">{t("company.noMoney")}</p>
  }
  // the same words as a branch's money report
  const rows = [
    ["booked_value", "bookedValue"],
    ["paid", "paid"],
    ["outstanding", "outstanding"],
    ["upcoming_unpaid", "upcomingUnpaid"],
    ["lost_cancelled", "lostCancelled"],
    ["lost_no_show", "lostNoShow"],
  ] as const
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {totals.flatMap((m) =>
        rows.map(([k, label]) => (
          <div
            key={`${m.currency}-${k}`}
            className="flex justify-between gap-3 border-b py-1"
          >
            <dt className="text-muted-foreground">{t(`reports.${label}`)}</dt>
            <dd className="font-medium tabular-nums">
              {money(m[k], m.currency)}
            </dd>
          </div>
        )),
      )}
    </dl>
  )
}
