import { PrinterIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"

import { ErrorAlert } from "@/components/form"
import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { dayIn, money, timeIn, todayIn } from "@/lib/format"

import { useSettings } from "../api"
import { PageHeader, Panel } from "../ui"
import { useCashUp, useCsv } from "./api"

/** /dashboard/:id/cash-up — the money marked paid on one day, to check against the till (staff and up) */
export function CashUpPage() {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const [params, setParams] = useSearchParams()
  const date = params.get("date") ?? todayIn(tz)
  const cash = useCashUp(date)
  const csv = useCsv()

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title={t("cashup.title")}
        lead={t("cashup.lead")}
        actions={
          <>
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              disabled={csv.isPending}
              onClick={() =>
                csv.mutate({
                  path: "/reports/cash-up",
                  query: { date },
                  filename: `cash-up_${date}.csv`,
                })
              }
            >
              {csv.isPending && <Spinner />}
              {t("reports.csv")}
            </Button>
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              onClick={() => window.print()}
            >
              <PrinterIcon />
              {t("cashup.print")}
            </Button>
          </>
        }
      />
      <ErrorAlert error={csv.error} />
      <div className="flex items-center gap-3">
        <Input
          type="date"
          aria-label={t("setup.classes.date")}
          value={date}
          max={todayIn(tz)}
          onChange={(e) =>
            e.target.value &&
            setParams({ date: e.target.value }, { replace: true })
          }
          className="h-11 w-44 lg:h-9"
        />
        <span className="font-medium">{dayIn(`${date}T12:00:00Z`, "UTC")}</span>
      </div>
      {cash.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : cash.isError ? (
        <PageError error={cash.error} onRetry={() => cash.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {cash.data.totals.length === 0 ? (
              <div className="rounded-xl bg-background p-4 ring-1 ring-border">
                <p className="text-sm text-muted-foreground">
                  {t("cashup.total")}
                </p>
                <p className="mt-1 text-3xl font-semibold">0</p>
              </div>
            ) : (
              cash.data.totals.map((m) => (
                <div
                  key={m.currency}
                  className="rounded-xl bg-background p-4 ring-1 ring-border"
                >
                  <p className="text-sm text-muted-foreground">
                    {t("cashup.totalIn", { currency: m.currency })}
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">
                    {money(m.amount, m.currency)}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Panel title={t("cashup.byMethod")}>
              <Rows
                empty={t("cashup.none")}
                rows={cash.data.by_method.map((r) => [
                  t(`desk.methods.${r.method}`),
                  t("cashup.count", { count: r.count }),
                  money(r.amount, r.currency),
                ])}
              />
            </Panel>
            <Panel title={t("cashup.byStaff")}>
              <Rows
                empty={t("cashup.none")}
                rows={cash.data.by_staff.map((r) => [
                  r.name,
                  t("cashup.count", { count: r.count }),
                  money(r.amount, r.currency),
                ])}
              />
            </Panel>
          </div>
          <Panel title={t("cashup.payments")}>
            <Rows
              empty={t("cashup.none")}
              rows={cash.data.payments.map((p) => [
                `${timeIn(p.paid_at, tz)} · ${p.code}`,
                `${p.name} · ${t(`desk.methods.${p.method}`)} · ${p.paid_by}`,
                money(p.amount, p.currency),
              ])}
            />
          </Panel>
        </>
      )}
    </div>
  )
}

function Rows({ rows, empty }: { rows: string[][]; empty: string }) {
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y text-sm">
      {rows.map(([a, b, c], i) => (
        <li key={i} className="flex flex-wrap items-center gap-x-3 py-2">
          <span className="font-medium">{a}</span>
          <span className="flex-1 text-muted-foreground">{b}</span>
          <span className="font-medium tabular-nums">{c}</span>
        </li>
      ))}
    </ul>
  )
}
