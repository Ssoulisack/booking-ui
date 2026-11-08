import {
  addDays,
  endOfMonth,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns"
import { DownloadIcon } from "lucide-react"
import { createContext, useContext, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ErrorAlert } from "@/components/global/form"
import { PageError } from "@/components/global/page-state"
import { Pager } from "@/components/global/Pager"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FinanceTotals, Money } from "@/types/report"
import { dayIn, money, todayIn } from "@/lib/format"

import { useDashboard } from "../context"
import { useSettings } from "@/hooks/use-branch"
import { PageHeader, Panel } from "../ui"
import { useCsv, useReport, useUnpaidPage } from "@/hooks/use-report"
import { TransactionsView } from "./TransactionsReport"
import { BookingSheet } from "./BookingSheet"
import { EventBookingsView, TableBookingsView } from "./BookingRowsReports"

// validated pair (categorical slots 1 and 2): magnitude in blue, money collected in orange
const BLUE = "#2a78d6"
const ORANGE = "#eb6834"

const PERIODS = ["thisMonth", "lastMonth", "last7", "custom"] as const
type Period = (typeof PERIODS)[number]

function rangeOf(
  period: Period,
  today: string,
  from?: string | null,
  to?: string | null,
) {
  const d = new Date(`${today}T12:00:00`)
  const ymd = (x: Date) => format(x, "yyyy-MM-dd")
  switch (period) {
    case "lastMonth": {
      const m = subMonths(d, 1)
      return { from: ymd(startOfMonth(m)), to: ymd(endOfMonth(m)) }
    }
    case "last7":
      return { from: ymd(subDays(d, 6)), to: today }
    case "custom":
      return { from: from || ymd(startOfMonth(d)), to: to || today }
    default:
      return { from: ymd(startOfMonth(d)), to: ymd(endOfMonth(d)) }
  }
}

/** Every day of the period, so a chart shows quiet days as zero instead of skipping them */
function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  for (
    let d = new Date(`${from}T12:00:00`);
    format(d, "yyyy-MM-dd") <= to;
    d = addDays(d, 1)
  ) {
    out.push(format(d, "yyyy-MM-dd"))
  }
  return out
}

const sum = (list: Money[]) =>
  list.map((m) => money(m.amount, m.currency)).join(" + ") || "0"

/** /dashboard/:id/reports — managers and the owner: bookings, money, court use, unpaid */
export function ReportsPage() {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const [params, setParams] = useSearchParams()
  const period = (params.get("period") ?? "thisMonth") as Period
  const { from, to } = rangeOf(
    period,
    todayIn(tz),
    params.get("from"),
    params.get("to"),
  )
  // a restaurant has no courts or takings to add up: its reports are the table and event booking lists
  const restaurant = useDashboard().branch.type === "restaurant"
  const tab =
    params.get("tab") ?? (restaurant ? "tableBookings" : "transactions")
  const set = (patch: Record<string, string>) =>
    setParams({ ...Object.fromEntries(params), ...patch }, { replace: true })

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("nav.reports")}
        lead={restaurant ? t("reports.rows.lead") : t("reports.lead")}
      />
      {restaurant ? (
        <Tabs value={tab} onValueChange={(v) => set({ tab: v })}>
          <TabsList className="h-11 lg:h-9">
            {["tableBookings", "eventBookings"].map((k) => (
              <TabsTrigger key={k} value={k} className="px-3">
                {t(`reports.tabs.${k}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="tableBookings" className="mt-4">
            <TableBookingsView />
          </TabsContent>
          <TabsContent value="eventBookings" className="mt-4">
            <EventBookingsView />
          </TabsContent>
        </Tabs>
      ) : (
        <CourtReports tab={tab} set={set} period={period} from={from} to={to} />
      )}
    </div>
  )
}

/** The reports of a court / sport branch: bookings, money, space use and unpaid for a period */
function CourtReports({
  tab,
  set,
  period,
  from,
  to,
}: {
  tab: string
  set: (patch: Record<string, string>) => void
  period: Period
  from: string
  to: string
}) {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const view = params.get("view") === "chart" ? "chart" : "table"
  return (
    <ViewContext.Provider value={view}>
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="radiogroup"
          aria-label={t("desk.period")}
          className="flex flex-wrap rounded-lg bg-muted p-1"
        >
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => set({ period: p })}
              className={`h-9 rounded-md px-3 text-sm font-medium lg:h-7 ${period === p ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              {t(`reports.periods.${p}`)}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <>
            <Input
              type="date"
              aria-label={t("setup.classes.from")}
              value={from}
              onChange={(e) => set({ from: e.target.value })}
              className="h-11 w-40 lg:h-9"
            />
            <Input
              type="date"
              aria-label={t("setup.classes.to")}
              value={to}
              min={from}
              onChange={(e) => set({ to: e.target.value })}
              className="h-11 w-40 lg:h-9"
            />
          </>
        )}
        <span className="text-sm text-muted-foreground">
          {dayIn(`${from}T12:00:00Z`, "UTC")} –{" "}
          {dayIn(`${to}T12:00:00Z`, "UTC")}
        </span>
        {(tab === "bookings" || tab === "money") && (
          <div
            role="radiogroup"
            aria-label={t("reports.view")}
            className="ml-auto flex rounded-lg bg-muted p-1"
          >
            {(["table", "chart"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                onClick={() => set({ view: v })}
                className={`h-9 rounded-md px-3 text-sm font-medium lg:h-7 ${view === v ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {t(`reports.views.${v}`)}
              </button>
            ))}
          </div>
        )}
      </div>
      <Tabs value={tab} onValueChange={(v) => set({ tab: v })}>
        {/* five tabs do not fit a phone: the bar scrolls inside its own box, the page never moves sideways */}
        <div className="-mx-4 no-scrollbar overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="h-11 w-max lg:h-9">
            {["transactions", "bookings", "money", "courts", "unpaid"].map(
              (k) => (
                <TabsTrigger key={k} value={k} className="px-3">
                  {t(`reports.tabs.${k}`)}
                </TabsTrigger>
              ),
            )}
          </TabsList>
        </div>
        <TabsContent value="transactions" className="mt-4">
          <TransactionsView from={from} to={to} />
        </TabsContent>
        <TabsContent value="bookings" className="mt-4">
          <BookingsReportView from={from} to={to} />
        </TabsContent>
        <TabsContent value="money" className="mt-4">
          <FinanceView from={from} to={to} />
        </TabsContent>
        <TabsContent value="courts" className="mt-4">
          <UtilisationView from={from} to={to} />
        </TabsContent>
        <TabsContent value="unpaid" className="mt-4">
          <UnpaidView from={from} to={to} />
        </TabsContent>
      </Tabs>
    </ViewContext.Provider>
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

function CsvButton({
  report,
  query,
  filename,
}: {
  report: string
  query: Record<string, string>
  filename: string
}) {
  const { t } = useTranslation()
  const csv = useCsv()
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="h-11 lg:h-9"
        disabled={csv.isPending}
        onClick={() => csv.mutate({ report, query, filename })}
      >
        {csv.isPending ? <Spinner /> : <DownloadIcon />}
        {t("reports.csv")}
      </Button>
      <ErrorAlert error={csv.error} />
    </div>
  )
}

function BookingsReportView({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation()
  const report = useReport("bookings", from, to)
  if (report.isPending) return <Skeleton className="h-80 rounded-xl" />
  if (report.isError) return <PageError error={report.error} />
  // a list the server leaves out counts as empty: one odd answer must not crash the screen
  const r = {
    ...report.data,
    by_status: report.data.by_status ?? {},
    per_day: report.data.per_day ?? [],
    per_sport: report.data.per_sport ?? [],
    booked_value: report.data.booked_value ?? [],
    top_customers: report.data.top_customers ?? [],
  }
  const by = (s: string) => r.by_status[s] ?? 0
  const config = {
    total: { label: t("reports.bookings"), color: BLUE },
  } satisfies ChartConfig
  const maxSport = Math.max(1, ...r.per_sport.map((s) => s.total))

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label={t("reports.bookings")} value={String(r.total)} />
        <Tile
          label={t("reports.bookedValue")}
          value={sum(r.booked_value)}
          hint={t("reports.bookedValueHint")}
        />
        <Tile
          label={t("booking.status.completed")}
          value={String(by("completed"))}
        />
        <Tile
          label={t("reports.lost")}
          value={String(by("cancelled") + by("no_show"))}
          hint={t("reports.lostHint", {
            cancelled: by("cancelled"),
            noShow: by("no_show"),
          })}
        />
      </div>
      <Panel title={t("reports.perDay")}>
        {r.per_day.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("reports.empty")}</p>
        ) : (
          <>
            <ChartBox>
              <ChartContainer config={config} className="h-64 w-full">
                <BarChart
                  data={eachDay(from, to).map((date) => ({
                    date,
                    total: r.per_day.find((d) => d.date === date)?.total ?? 0,
                  }))}
                  margin={{ left: -16, right: 8 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid vertical={false} strokeOpacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d: string) => d.slice(8)}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(d) => dayIn(`${d}T12:00:00Z`, "UTC")}
                      />
                    }
                  />
                  <Bar
                    dataKey="total"
                    fill="var(--color-total)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ChartContainer>
            </ChartBox>
            <TableView
              head={[t("reports.day"), t("reports.bookings")]}
              rows={r.per_day
                .filter((d) => d.total > 0)
                .map((d) => [
                  dayIn(`${d.date}T12:00:00Z`, "UTC"),
                  String(d.total),
                ])}
            />
          </>
        )}
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("reports.perSport")}>
          {r.per_sport.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("reports.empty")}
            </p>
          )}
          <ul className="space-y-3 empty:hidden">
            {r.per_sport.map((s) => (
              <li key={s.sport_id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {s.total}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(s.total / maxSport) * 100}%`,
                      background: BLUE,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("reports.topCustomers")}>
          {r.top_customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("reports.empty")}
            </p>
          ) : (
            <ol className="divide-y text-sm">
              {r.top_customers.map((c, i) => (
                <li
                  key={`${c.contact}-${i}`}
                  className="flex items-center gap-3 py-2"
                >
                  <span className="w-5 text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block truncate text-muted-foreground">
                      {c.contact}
                    </span>
                  </span>
                  <span className="text-right tabular-nums">
                    {t("reports.nBookings", { count: c.bookings })}
                    <span className="block text-muted-foreground">
                      {sum(c.value)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  )
}

function FinanceView({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation()
  const report = useReport("finance", from, to)
  if (report.isPending) return <Skeleton className="h-80 rounded-xl" />
  if (report.isError) return <PageError error={report.error} />
  const f = report.data
  const config = {
    booked_value: { label: t("reports.bookedValue"), color: BLUE },
    paid: { label: t("reports.paid"), color: ORANGE },
  } satisfies ChartConfig

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          {t("reports.financeRule")}
        </p>
        <CsvButton
          report="finance"
          query={{ from, to }}
          filename={`finance_${from}_${to}.csv`}
        />
      </div>
      {f.totals.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("reports.empty")}</p>
      )}
      {f.totals.map((x) => (
        <FinanceTiles key={x.currency} totals={x} />
      ))}
      {f.totals.map((x) => {
        const mine = f.per_day.filter((d) => d.currency === x.currency)
        if (mine.length === 0) return null
        const days = eachDay(from, to).map(
          (date) =>
            mine.find((d) => d.date === date) ?? {
              date,
              currency: x.currency,
              booked_value: 0,
              paid: 0,
            },
        )
        return (
          <Panel
            key={x.currency}
            title={t("reports.moneyPerDay", { currency: x.currency })}
          >
            <ChartBox>
              <ChartContainer config={config} className="h-64 w-full">
                <BarChart
                  data={days}
                  margin={{ left: 8, right: 8 }}
                  barGap={2}
                  barCategoryGap="20%"
                >
                  <CartesianGrid vertical={false} strokeOpacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d: string) => d.slice(8)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v: number) =>
                      Intl.NumberFormat("en", { notation: "compact" }).format(v)
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(d) => dayIn(`${d}T12:00:00Z`, "UTC")}
                        formatter={(value, name) => (
                          <span className="flex w-full justify-between gap-3">
                            <span>
                              {config[name as keyof typeof config]?.label}
                            </span>
                            <span className="tabular-nums">
                              {money(Number(value), x.currency)}
                            </span>
                          </span>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="booked_value"
                    fill="var(--color-booked_value)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="paid"
                    fill="var(--color-paid)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ChartContainer>
            </ChartBox>
            <TableView
              head={[
                t("reports.day"),
                t("reports.bookedValue"),
                t("reports.paid"),
              ]}
              rows={days
                .filter((d) => d.booked_value > 0 || d.paid > 0)
                .map((d) => [
                  dayIn(`${d.date}T12:00:00Z`, "UTC"),
                  money(d.booked_value, x.currency),
                  money(d.paid, x.currency),
                ])}
            />
          </Panel>
        )
      })}
    </div>
  )
}

function FinanceTiles({ totals: x }: { totals: FinanceTotals }) {
  const { t } = useTranslation()
  const m = (n: number) => money(n, x.currency)
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          label={t("reports.bookedValue")}
          value={m(x.booked_value)}
          hint={t("reports.bookedValueHint")}
        />
        <Tile label={t("reports.paid")} value={m(x.paid)} />
        <Tile
          label={t("reports.outstanding")}
          value={m(x.outstanding)}
          hint={t("reports.outstandingHint")}
        />
        <Tile
          label={t("reports.upcomingUnpaid")}
          value={m(x.upcoming_unpaid)}
          hint={t("reports.upcomingUnpaidHint")}
        />
        <Tile label={t("reports.lostNoShow")} value={m(x.lost_no_show)} />
        <Tile
          label={t("reports.lostCancelled")}
          value={m(x.lost_cancelled)}
          hint={t("reports.lostCancelledHint")}
        />
      </div>
    </div>
  )
}

function UtilisationView({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation()
  const report = useReport("utilisation", from, to)
  if (report.isPending) return <Skeleton className="h-64 rounded-xl" />
  if (report.isError) return <PageError error={report.error} />
  return (
    <Panel
      title={t("reports.utilisation")}
      lead={t("reports.utilisationLead")}
      actions={
        <CsvButton
          report="utilisation"
          query={{ from, to }}
          filename={`utilisation_${from}_${to}.csv`}
        />
      }
    >
      {report.data.resources.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("reports.empty")}</p>
      ) : (
        <ul className="space-y-4">
          {report.data.resources.map((r) => (
            <li key={r.resource_id} className="space-y-1">
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {r.percent.toFixed(1)}% ·{" "}
                  {t("reports.hoursOf", {
                    booked: Math.round(r.booked_minutes / 6) / 10,
                    open: Math.round(r.open_minutes / 6) / 10,
                  })}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    width: `${Math.min(100, r.percent)}%`,
                    background: BLUE,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function UnpaidView({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const report = useUnpaidPage(from, to, page, limit)
  const [open, setOpen] = useState<number | null>(null)
  if (report.isPending) return <Skeleton className="h-64 rounded-xl" />
  if (report.isError) return <PageError error={report.error} />
  return (
    <Panel
      title={t("reports.unpaidTitle")}
      lead={t("reports.unpaidLead")}
      actions={
        <CsvButton
          report="unpaid"
          query={{ from, to }}
          filename={`unpaid_${from}_${to}.csv`}
        />
      }
    >
      {report.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("reports.noUnpaid")}</p>
      ) : (
        <ul className="divide-y">
          {report.data.items.map((r) => (
            <li key={r.booking_id}>
              <button
                type="button"
                onClick={() => setOpen(r.booking_id)}
                className="flex w-full flex-wrap items-center gap-3 py-3 text-left hover:bg-muted/40"
              >
                <span className="w-28 shrink-0 text-sm text-muted-foreground">
                  {dayIn(r.starts_at, tz)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{r.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {[r.phone, r.email, r.code].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="font-medium tabular-nums">
                  {money(r.amount, r.currency)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Pager
        meta={report.data.meta}
        page={page}
        onPage={setPage}
        limit={limit}
        onLimit={(n) => {
          setLimit(n)
          setPage(1)
        }}
      />
      <BookingSheet id={open} onClose={() => setOpen(null)} />
    </Panel>
  )
}

/** The reports show their numbers as a table (the default) or as charts: the switch above the tabs */
const ViewContext = createContext<"table" | "chart">("table")

/** A chart: shown only when the charts view is chosen */
function ChartBox({ children }: { children: ReactNode }) {
  return useContext(ViewContext) === "chart" ? <>{children}</> : null
}

/** The numbers as a table: open on the table view; folded under the chart on the chart view */
function TableView({ head, rows }: { head: string[]; rows: string[][] }) {
  const { t } = useTranslation()
  const view = useContext(ViewContext)
  if (view === "table")
    return (
      <div className="relative overflow-x-auto text-sm">
        <table className="w-full">
          <thead className="border-b text-left whitespace-nowrap text-muted-foreground">
            <tr>
              {head.map((h, i) => (
                <th
                  key={h}
                  className={`py-2 pr-4 font-medium ${i > 0 ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td
                    key={j}
                    className={`py-2 pr-4 tabular-nums ${j > 0 ? "text-right" : ""}`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  return (
    <details className="mt-3 text-sm">
      <summary className="min-h-9 cursor-pointer text-muted-foreground">
        {t("reports.showTable")}
      </summary>
      <table className="mt-2 w-full">
        <thead>
          <tr className="text-left text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="py-1 pr-4 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => (
                <td key={j} className="py-1 pr-4 tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
