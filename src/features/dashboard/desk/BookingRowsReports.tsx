import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { BookingReportRow, EventReportRow } from "@/lib/api/types"
import { dayIn, money, shortPhone, stampIn, todayIn } from "@/lib/format"

import { useEvents, useSettings } from "../api"
import { Panel } from "../ui"
import { useEventReport, useTableReport } from "./api"

// the banks the pay screen can offer (the gateway's codes)
const BANKS = ["bcel", "ldb", "jdb", "apb", "ib", "stb", "m-money"]

/** A bank by its logo (public/banks); the name sits beside it when `named`, else it is the logo's alt text and title */
function Bank({ code, named = false }: { code: string; named?: boolean }) {
  if (code === "-" || !BANKS.includes(code))
    return <>{code === "-" ? "-" : code.toUpperCase()}</>
  return (
    <span
      className="inline-flex items-center gap-2 leading-none"
      title={code.toUpperCase()}
    >
      {/* every logo in the same box, so the names beside them line up whatever the logo's shape */}
      <img
        src={`/banks/${code}.png`}
        alt={named ? "" : code.toUpperCase()}
        className="h-5 w-8 shrink-0 object-contain object-left"
      />
      {named && <span>{code.toUpperCase()}</span>}
    </span>
  )
}

const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"]
const PAYMENTS = ["unpaid", "paid", "refunded"]
const ALL = "all"
// the event list shows only the newest events, so it stays short however many events the branch has had
const LATEST_EVENTS = 12

function Pick({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string; icon?: ReactNode }>
}) {
  return (
    <div className="space-y-1">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="h-11 w-44 lg:h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.icon ?? o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Search box: asks the server 0.4 s after the last key, so typing does not ask for every letter */
function SearchField({ onSearch }: { onSearch: (v: string) => void }) {
  const { t } = useTranslation()
  const [text, setText] = useState("")
  // only a changed text asks again: a re-render must not send the page back to 1
  const sent = useRef("")
  const latest = useRef(onSearch)
  latest.current = onSearch
  useEffect(() => {
    const id = setTimeout(() => {
      const v = text.trim()
      if (v === sent.current) return
      sent.current = v
      latest.current(v)
    }, 400)
    return () => clearTimeout(id)
  }, [text])
  return (
    <div className="space-y-1">
      <span className="block text-xs text-muted-foreground">
        {t("reports.rows.search")}
      </span>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t("reports.rows.search")}
          placeholder={t("reports.rows.searchHint")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-11 w-64 pl-9 lg:h-9"
        />
      </div>
    </div>
  )
}

/** "Refresh" with the time of the last update; the list also refreshes itself every minute */
function RefreshBar({
  fetching,
  updatedAt,
  onRefresh,
}: {
  fetching: boolean
  updatedAt: number
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const tz = useTz()
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <span className="text-xs text-muted-foreground">
        {updatedAt > 0 &&
          t("reports.rows.updatedAt", {
            time: stampIn(new Date(updatedAt).toISOString(), tz).slice(11),
          })}{" "}
        {t("reports.rows.autoRefresh")}
      </span>
      <Button
        variant="outline"
        className="h-11 lg:h-9"
        disabled={fetching}
        onClick={onRefresh}
      >
        <RefreshCwIcon className={fetching ? "animate-spin" : ""} />
        {t("reports.rows.refresh")}
      </Button>
    </div>
  )
}

function DayField({
  label,
  value,
  onChange,
  min,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  min?: string
}) {
  return (
    <div className="space-y-1">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <Input
        type="date"
        aria-label={label}
        value={value}
        min={min}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-11 w-40 lg:h-9"
      />
    </div>
  )
}

function Card({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
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

function Pager({
  page,
  total,
  onPage,
}: {
  page: number
  total: number
  onPage: (p: number) => void
}) {
  const { t } = useTranslation()
  if (total <= 1) return null
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <span className="text-sm text-muted-foreground">
        {t("reports.rows.page", { page, total })}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="size-11 lg:size-9"
        aria-label={t("reports.rows.prev")}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="size-11 lg:size-9"
        aria-label={t("reports.rows.next")}
        disabled={page >= total}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  )
}

function useTz() {
  return useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
}

/** "10 +1": a booking of several tables shows the first one, the rest are in the details */
function tablesShort(tables: string) {
  const list = tables.split(", ")
  return list.length > 1 ? `${list[0]} +${list.length - 1}` : tables
}

type Row = BookingReportRow | EventReportRow
const isEventRow = (r: Row): r is EventReportRow => "payment_status" in r

/** The list: one short line per booking (phone as 20xxxxxxxx, long emails cut with …), the eye opens the details */
function Grid({ items, event = false }: { items: Row[]; event?: boolean }) {
  const { t } = useTranslation()
  const tz = useTz()
  const [open, setOpen] = useState<Row | null>(null)
  const when = (iso: string) => stampIn(iso, tz)
  const pay = (r: EventReportRow) =>
    r.payment_status === "-"
      ? "-"
      : t(`reports.rows.pay.${r.payment_status}`, r.payment_status)
  const head = [
    "index",
    "table",
    "code",
    "name",
    "phone",
    "type",
    "bookTime",
    "status",
    ...(event ? ["paymentStatus", "bank", "amount"] : []),
  ].map((k) => t(`reports.rows.${k}`))
  const right = event ? [head.length - 1] : []

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[56rem] text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {head.map((h, i) => (
              <th
                key={h}
                className={`px-2 py-2 font-medium whitespace-nowrap ${right.includes(i) ? "text-right" : ""}`}
              >
                {h}
              </th>
            ))}
            <th className="w-10 px-2 py-2">
              <span className="sr-only">{t("reports.rows.details")}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((r) => (
            <tr key={r.book_code}>
              <td className="px-2 py-2 whitespace-nowrap">{r.index}</td>
              <td className="px-2 py-2 whitespace-nowrap">
                {tablesShort(r.table_number)}
              </td>
              <td className="px-2 py-2 whitespace-nowrap">{r.book_code}</td>
              <td
                className="max-w-[10rem] truncate px-2 py-2"
                title={r.fullname}
              >
                {r.fullname}
              </td>
              <td className="px-2 py-2 whitespace-nowrap tabular-nums">
                {shortPhone(r.phone)}
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                {t(`reports.rows.types.${r.customer_type}`)}
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                {when(r.book_time)}
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                {t(`booking.status.${r.status}`)}
              </td>
              {isEventRow(r) && event && (
                <>
                  <td className="px-2 py-2 whitespace-nowrap">{pay(r)}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <Bank code={r.bank} />
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums">
                    {money(r.amount, r.currency)}
                  </td>
                </>
              )}
              <td className="px-1 py-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 lg:size-8"
                  aria-label={t("reports.rows.seeDetails", {
                    code: r.book_code,
                  })}
                  onClick={() => setOpen(r)}
                >
                  <EyeIcon />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.book_code}</DialogTitle>
                <DialogDescription>
                  {t("reports.rows.detailsLead")}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {(
                  [
                    [t("reports.rows.table"), open.table_number],
                    [t("reports.rows.name"), open.fullname],
                    [t("reports.rows.phone"), shortPhone(open.phone)],
                    [t("reports.rows.email"), open.email],
                    [
                      t("reports.rows.type"),
                      t(`reports.rows.types.${open.customer_type}`),
                    ],
                    [t("reports.rows.bookTime"), when(open.book_time)],
                    [
                      t("reports.rows.status"),
                      t(`booking.status.${open.status}`),
                    ],
                    ...(isEventRow(open)
                      ? [
                          [t("reports.rows.paymentStatus"), pay(open)],
                          [
                            t("reports.rows.bank"),
                            <Bank code={open.bank} named />,
                          ],
                          [
                            t("reports.rows.amount"),
                            money(open.amount, open.currency),
                          ],
                        ]
                      : []),
                  ] as Array<[string, ReactNode]>
                ).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

const sortOptions = (t: (k: string) => string) => [
  { value: "desc", label: t("reports.rows.newest") },
  { value: "asc", label: t("reports.rows.oldest") },
]

/** Table bookings (no events): three cards for the first day, then one row per booking */
export function TableBookingsView() {
  const { t } = useTranslation()
  const tz = useTz()
  const today = todayIn(tz)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [status, setStatus] = useState(ALL)
  const [order, setOrder] = useState("desc")
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const report = useTableReport({
    from,
    to: to < from ? from : to,
    status: status === ALL ? "" : status,
    keyword,
    sort_by: "created_at",
    order,
    page,
    limit: 20,
  })
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(1)
    }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <DayField
          label={t("reports.rows.from")}
          value={from}
          onChange={reset(setFrom)}
        />
        <DayField
          label={t("reports.rows.to")}
          value={to}
          min={from}
          onChange={reset(setTo)}
        />
        <Pick
          label={t("reports.rows.status")}
          value={status}
          onChange={reset(setStatus)}
          options={[
            { value: ALL, label: t("reports.rows.allStatuses") },
            ...STATUSES.map((s) => ({
              value: s,
              label: t(`booking.status.${s}`),
            })),
          ]}
        />
        <Pick
          label={t("reports.rows.sortBy")}
          value={order}
          onChange={reset(setOrder)}
          options={sortOptions(t)}
        />
        <SearchField onSearch={reset(setKeyword)} />
      </div>
      {report.isPending ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : report.isError ? (
        <PageError error={report.error} />
      ) : (
        <>
          <RefreshBar
            fetching={report.isFetching}
            updatedAt={report.dataUpdatedAt}
            onRefresh={() => void report.refetch()}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Card
              label={t("reports.rows.totalTables")}
              value={report.data.cards.total_tables}
              hint={t("reports.rows.cardsDay", {
                date: dayIn(`${report.data.cards.date}T12:00:00Z`, "UTC"),
              })}
            />
            <Card
              label={t("reports.rows.tablesTaken")}
              value={report.data.cards.tables_taken}
            />
            <Card
              label={t("reports.rows.available")}
              value={report.data.cards.available}
            />
          </div>
          <Panel
            title={t("reports.tabs.tableBookings")}
            lead={t("reports.rows.tableLead")}
          >
            {report.data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("reports.rows.empty")}
              </p>
            ) : (
              <Grid items={report.data.items} />
            )}
            <Pager
              page={report.data.meta.page}
              total={report.data.meta.total_page}
              onPage={setPage}
            />
          </Panel>
        </>
      )}
    </div>
  )
}

/** Event bookings: filter by event, bank, status and payment; totals of good and cancelled bookings */
export function EventBookingsView() {
  const { t } = useTranslation()
  const events = useEvents()
  const [eventId, setEventId] = useState("")
  const [bank, setBank] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [payment, setPayment] = useState(ALL)
  const [order, setOrder] = useState("desc")
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const none = (v: string) => (v === ALL ? "" : v)
  // newest event first (by its first day); the report opens on the latest one
  const latest = [...(events.data ?? [])]
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on) || b.id - a.id)
    .slice(0, LATEST_EVENTS)
  const chosen = eventId || (latest[0] ? String(latest[0].id) : "")
  const report = useEventReport(
    {
      event_id: chosen,
      bank: none(bank),
      status: none(status),
      payment_status: none(payment),
      keyword,
      sort_by: "created_at",
      order,
      page,
      limit: 20,
    },
    !events.isPending,
  )
  const reset = (set: (v: string) => void) => (v: string) => {
    set(v)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Pick
          label={t("reports.rows.event")}
          value={chosen}
          onChange={reset(setEventId)}
          options={latest.map((e) => ({
            value: String(e.id),
            label: `${e.name} · ${e.starts_on}`,
          }))}
        />
        <Pick
          label={t("reports.rows.bank")}
          value={bank}
          onChange={reset(setBank)}
          options={[
            { value: ALL, label: t("reports.rows.allBanks") },
            ...BANKS.map((b) => ({
              value: b,
              label: b.toUpperCase(),
              icon: <Bank code={b} named />,
            })),
          ]}
        />
        <Pick
          label={t("reports.rows.status")}
          value={status}
          onChange={reset(setStatus)}
          options={[
            { value: ALL, label: t("reports.rows.allStatuses") },
            ...STATUSES.map((s) => ({
              value: s,
              label: t(`booking.status.${s}`),
            })),
          ]}
        />
        <Pick
          label={t("reports.rows.paymentStatus")}
          value={payment}
          onChange={reset(setPayment)}
          options={[
            { value: ALL, label: t("reports.rows.allPayments") },
            ...PAYMENTS.map((p) => ({
              value: p,
              label: t(`reports.rows.pay.${p}`),
            })),
          ]}
        />
        <Pick
          label={t("reports.rows.sortBy")}
          value={order}
          onChange={reset(setOrder)}
          options={sortOptions(t)}
        />
        <SearchField onSearch={reset(setKeyword)} />
      </div>
      {report.isPending ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : report.isError ? (
        <PageError error={report.error} />
      ) : (
        <>
          <RefreshBar
            fetching={report.isFetching}
            updatedAt={report.dataUpdatedAt}
            onRefresh={() => void report.refetch()}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Card
              label={t("reports.rows.successTotal")}
              value={
                report.data.totals
                  .map((x) => money(x.success_amount, x.currency))
                  .join(" + ") || "0"
              }
              hint={t("reports.rows.successHint")}
            />
            <Card
              label={t("reports.rows.cancelledTotal")}
              value={
                report.data.totals
                  .map((x) => money(x.cancelled_amount, x.currency))
                  .join(" + ") || "0"
              }
              hint={t("reports.rows.totalsHint")}
            />
          </div>
          <Panel
            title={t("reports.tabs.eventBookings")}
            lead={t("reports.rows.eventLead")}
          >
            {report.data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("reports.rows.empty")}
              </p>
            ) : (
              <Grid items={report.data.items} event />
            )}
            <Pager
              page={report.data.meta.page}
              total={report.data.meta.total_page}
              onPage={setPage}
            />
          </Panel>
        </>
      )}
    </div>
  )
}
