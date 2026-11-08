import { DownloadIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ErrorAlert } from "@/components/global/form"
import { PageError } from "@/components/global/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { TransactionRow } from "@/types/report"
import { dayIn, money, timeIn } from "@/lib/format"
import { displayPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"

import { useSettings } from "../api"
import { Pager } from "@/components/global/Pager"
import { paginate } from "@/features/company/paging"
import { useCsv, useReport } from "./api"

const selectClass =
  "h-11 rounded-lg border border-input bg-background px-2.5 text-base lg:h-9 lg:text-sm"

/**
 * Every payment of the period as one table, newest first: money for bookings, money for packages, and the package
 * visits used (no money). Counted by the day the money came in. Filter by type, how it was paid, or a name / phone /
 * code; the totals under the table are for what the filters show.
 */
export function TransactionsView({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const report = useReport("transactions", from, to)
  const csv = useCsv()
  const [kind, setKind] = useState("")
  const [method, setMethod] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)

  const rows = report.data?.rows
  const methods = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.method))].sort(),
    [rows],
  )
  const q = search.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      (rows ?? []).filter(
        (r) =>
          (!kind || r.kind === kind) &&
          (!method || r.method === method) &&
          (!q ||
            [r.code, r.name, r.phone, r.what]
              .join(" ")
              .toLowerCase()
              .includes(q)),
      ),
    [rows, kind, method, q],
  )

  const paged = paginate(filtered, page, limit)
  if (report.isPending) return <Skeleton className="h-80 rounded-xl" />
  if (report.isError) return <PageError error={report.error} />
  const r = report.data
  const sum = (k: TransactionRow["kind"], currency: string) =>
    r.by_kind.find((x) => x.kind === k && x.currency === currency)
  const visits = r.by_kind
    .filter((x) => x.kind === "visit")
    .reduce((n, x) => n + x.count, 0)

  // totals of what the filters show, per currency
  const filteredTotals = new Map<string, number>()
  for (const x of filtered)
    filteredTotals.set(
      x.currency,
      (filteredTotals.get(x.currency) ?? 0) + x.amount,
    )

  return (
    <div className="space-y-5">
      <p className="max-w-prose text-sm text-muted-foreground">
        {t("reports.tx.lead")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {r.totals.length === 0 && (
          <Tile label={t("reports.tx.received")} value="-" />
        )}
        {r.totals.map((x) => (
          <Tile
            key={x.currency}
            label={t("reports.tx.received")}
            value={money(x.amount, x.currency)}
          />
        ))}
        {r.totals.map((x) => (
          <Tile
            key={`b-${x.currency}`}
            label={t("reports.tx.kinds.booking")}
            value={money(sum("booking", x.currency)?.amount ?? 0, x.currency)}
            hint={t("reports.tx.count", {
              count: sum("booking", x.currency)?.count ?? 0,
            })}
          />
        ))}
        {r.totals.map((x) => (
          <Tile
            key={`p-${x.currency}`}
            label={t("reports.tx.kinds.package")}
            value={money(sum("package", x.currency)?.amount ?? 0, x.currency)}
            hint={t("reports.tx.count", {
              count: sum("package", x.currency)?.count ?? 0,
            })}
          />
        ))}
        <Tile
          label={t("reports.tx.kinds.visit")}
          value={String(visits)}
          hint={t("reports.tx.visitsHint")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            aria-label={t("reports.tx.search")}
            placeholder={t("reports.tx.search")}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="h-11 pl-9 text-base lg:h-9 lg:text-sm"
          />
        </div>
        <select
          aria-label={t("reports.tx.type")}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value)
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">{t("reports.tx.allTypes")}</option>
          {(["booking", "package", "visit"] as const).map((k) => (
            <option key={k} value={k}>
              {t(`reports.tx.kinds.${k}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("reports.tx.method")}
          value={method}
          onChange={(e) => {
            setMethod(e.target.value)
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">{t("reports.tx.allMethods")}</option>
          {methods.map((m) => (
            <option key={m} value={m}>
              {t(`desk.methods.${m as "cash"}`)}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          className="h-11 lg:h-9"
          disabled={csv.isPending}
          onClick={() =>
            csv.mutate({
              report: "transactions",
              query: { from, to },
              filename: `transactions_${from}_${to}.csv`,
            })
          }
        >
          {csv.isPending ? <Spinner /> : <DownloadIcon />}
          {t("reports.csv")}
        </Button>
      </div>
      <ErrorAlert error={csv.error} />

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-background p-6 text-muted-foreground ring-1 ring-border">
          {t("reports.tx.empty")}
        </p>
      ) : (
        // a phone scrolls the table sideways inside its box
        <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="border-b text-left whitespace-nowrap text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">
                  {t("reports.tx.when")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("reports.tx.type")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.colCode")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.colCustomer")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("reports.tx.what")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("reports.tx.method")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("reports.tx.paidBy")}
                </th>
                <th className="py-2 text-right font-medium">
                  {t("reports.tx.amount")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paged.items.map((x, i) => (
                <tr key={`${x.kind}-${x.code}-${i}`} className="align-top">
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span className="block">{dayIn(x.paid_at, tz)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {timeIn(x.paid_at, tz)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <Badge
                      className={cn(
                        "border-0",
                        x.kind === "package"
                          ? "bg-violet-100 text-violet-900 dark:bg-violet-400/20 dark:text-violet-200"
                          : x.kind === "visit"
                            ? "bg-muted text-muted-foreground"
                            : "bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-200",
                      )}
                    >
                      {t(`reports.tx.kinds.${x.kind}`)}
                    </Badge>
                    {x.cancelled && (
                      <span className="mt-1 block text-xs text-destructive">
                        {t("reports.tx.cancelled")}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs whitespace-nowrap">
                    {x.code}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="block font-medium whitespace-nowrap">
                      {x.name}
                    </span>
                    <span className="block text-xs whitespace-nowrap text-muted-foreground">
                      {x.phone && displayPhone(x.phone)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    {x.kind === "visit" && x.package ? (
                      <>
                        {/* which package paid it comes first, then what it was used for */}
                        <span className="block font-medium">{x.package}</span>
                        <span className="block text-xs text-muted-foreground">
                          {x.package_code} · {x.what}
                        </span>
                      </>
                    ) : (
                      x.what
                    )}
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    {t(`desk.methods.${x.method as "cash"}`)}
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    {x.paid_by || "-"}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 text-right whitespace-nowrap tabular-nums",
                      x.kind === "visit" && "text-muted-foreground",
                    )}
                  >
                    {x.kind === "visit" ? "-" : money(x.amount, x.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 font-semibold">
              {[...filteredTotals].map(([currency, amount]) => (
                <tr key={currency}>
                  <td colSpan={7} className="py-2.5 pr-3 text-right">
                    {t("reports.tx.total", { count: filtered.length })}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap tabular-nums">
                    {money(amount, currency)}
                  </td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}
      <Pager
        meta={paged.meta}
        page={paged.page}
        onPage={setPage}
        limit={limit}
        onLimit={(n) => {
          setLimit(n)
          setPage(1)
        }}
      />
    </div>
  )
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl bg-background p-4 ring-1 ring-border">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
