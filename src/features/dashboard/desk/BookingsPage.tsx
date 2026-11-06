import { PlusIcon, SearchIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"

import { PageError } from "@/components/page-state"
import { Pager, PAGE_SIZES } from "@/components/Pager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/features/public/BookingCard"
import { bookingTitle } from "@/features/public/booking-utils"
import { dayIn, nextDays, timeIn, todayIn } from "@/lib/format"

import { useSettings } from "../api"
import { useDashboard } from "../context"
import { PageHeader } from "../ui"
import { useBookingList, usePendingBookings, type BookingFilters } from "./api"
import { BookingSheet } from "./BookingSheet"
import { NewBookingDialog } from "./NewBookingDialog"
import { PaymentBadge } from "./PaymentBadge"

const STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
] as const
// the Bookings tab opens on today; bookings waiting for approval have a tab of their own (every date)
const PERIODS = ["today", "tomorrow", "week", "custom"] as const

/** /dashboard/:id/bookings — find and handle bookings; filters live in the address */
export function BookingsPage() {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState(params.get("q") ?? "")
  // a restaurant: free table bookings, no payment to track
  const restaurant = useDashboard().branch.type === "restaurant"

  const today = todayIn(tz)
  // two tabs: the day's bookings (opens on today), and the ones waiting for approval. An old link with period=pending
  // opens the second one.
  const approval =
    params.get("tab") === "approval" || params.get("period") === "pending"
  const pending = usePendingBookings(useDashboard().branch.branch_id)
  const period = approval
    ? "pending"
    : ((params.get("period") ?? "today") as (typeof PERIODS)[number])
  const range =
    period === "today" || period === "pending"
      ? { from: today, to: today }
      : period === "tomorrow"
        ? { from: nextDays(tz, 2)[1], to: nextDays(tz, 2)[1] }
        : period === "week"
          ? { from: today, to: nextDays(tz, 7)[6] }
          : { from: params.get("from") ?? today, to: params.get("to") ?? today }
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1)
  const limit = PAGE_SIZES.includes(Number(params.get("limit")) as 20)
    ? Number(params.get("limit"))
    : PAGE_SIZES[0]
  const filters: BookingFilters = {
    // a search, one customer's history and the pending list look at every date
    ...(params.get("q") || params.get("customer") || period === "pending"
      ? {}
      : range),
    keyword: params.get("q") || undefined,
    status:
      period === "pending" ? "pending" : params.get("status") || undefined,
    payment_status: params.get("pay") || undefined,
    customer_id: Number(params.get("customer")) || undefined,
    page,
    limit,
  }
  const list = useBookingList(filters)
  const set = (patch: Record<string, string | undefined>) => {
    const next = {
      ...Object.fromEntries(params),
      ...patch,
      page: patch.page ?? "1",
    }
    setParams(
      Object.fromEntries(Object.entries(next).filter(([, v]) => v)) as Record<
        string,
        string
      >,
      { replace: true },
    )
  }
  const meta = list.data?.meta

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("nav.bookings")}
        lead={params.get("q") ? t("desk.searchAll") : undefined}
        // a restaurant has no desk reservation form (the court form does not fit a table): walk-ins are on the Calendar
        actions={
          restaurant ? undefined : (
            <Button className="h-11 lg:h-9" onClick={() => setAdding(true)}>
              <PlusIcon />
              {t("desk.newBooking")}
            </Button>
          )
        }
      />
      <Tabs
        value={approval ? "approval" : "bookings"}
        onValueChange={(v) =>
          set({
            tab: v === "approval" ? "approval" : undefined,
            period: undefined,
            status: undefined,
            from: undefined,
            to: undefined,
          })
        }
      >
        <TabsList className="h-11 lg:h-9">
          <TabsTrigger value="bookings" className="px-4">
            {t("desk.tabs.bookings")}
          </TabsTrigger>
          <TabsTrigger value="approval" className="gap-2 px-4">
            {t("desk.tabs.approval")}
            {!!pending.data && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                {pending.data}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          set({ q: search.trim() || undefined })
        }}
      >
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("desk.search")}
            placeholder={t("desk.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              if (!e.target.value) set({ q: undefined })
            }}
            className="h-11 pl-9 text-base lg:h-9 lg:text-sm"
          />
        </div>
        {!approval && (
          <Filter
            label={t("desk.period")}
            value={period}
            onChange={(v) => set({ period: v })}
            options={PERIODS.map((p) => ({
              value: p,
              label: t(`desk.periods.${p}`),
            }))}
          />
        )}
        {period === "custom" && (
          <>
            <Input
              type="date"
              aria-label={t("setup.classes.from")}
              value={range.from}
              onChange={(e) => set({ from: e.target.value })}
              className="h-11 w-40 lg:h-9"
            />
            <Input
              type="date"
              aria-label={t("setup.classes.to")}
              value={range.to}
              min={range.from}
              onChange={(e) => set({ to: e.target.value })}
              className="h-11 w-40 lg:h-9"
            />
          </>
        )}
        {!approval && (
          <Filter
            label={t("desk.status")}
            value={params.get("status") ?? "all"}
            onChange={(v) => set({ status: v === "all" ? undefined : v })}
            options={[
              { value: "all", label: t("desk.allStatuses") },
              ...STATUSES.map((s) => ({
                value: s,
                label: t(`booking.status.${s}`),
              })),
            ]}
          />
        )}
        {!restaurant && (
          <Filter
            label={t("desk.payment")}
            value={params.get("pay") ?? "all"}
            onChange={(v) => set({ pay: v === "all" ? undefined : v })}
            options={[
              { value: "all", label: t("desk.allPayments") },
              { value: "unpaid", label: t("desk.unpaid") },
              { value: "paid", label: t("desk.paid") },
            ]}
          />
        )}
      </form>
      {params.get("customer") && (
        <Badge variant="secondary" className="h-8 gap-2 px-3">
          {t("desk.oneCustomer")}
          <button
            type="button"
            className="underline"
            onClick={() => set({ customer: undefined })}
          >
            {t("desk.clear")}
          </button>
        </Badge>
      )}

      {list.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : list.isError ? (
        <PageError error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <p className="rounded-xl bg-background p-6 text-muted-foreground ring-1 ring-border">
          {period === "pending" && !params.get("q") && !params.get("customer")
            ? t("desk.noPending")
            : t("desk.noBookings")}
        </p>
      ) : (
        <>
          {/* the list shown may be the previous one (a new tab or filter is loading) or old (the server went away):
              dim it and say so, so nobody acts on rows that are not current */}
          {list.isRefetchError ? (
            <p
              role="alert"
              className="rounded-lg bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
            >
              {t("common.offlineStale")}
            </p>
          ) : (
            list.isPlaceholderData && (
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {t("common.updating")}
              </p>
            )
          )}
          <ul
            aria-busy={list.isPlaceholderData}
            className={
              "divide-y rounded-xl bg-background ring-1 ring-border transition-opacity" +
              (list.isPlaceholderData || list.isRefetchError
                ? " opacity-50"
                : "")
            }
          >
            {list.data.items.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setOpen(b.id)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-muted/50 sm:flex-nowrap"
                >
                  <span className="w-32 shrink-0">
                    <span className="block font-medium tabular-nums">
                      {!b.guests
                        ? `${timeIn(b.starts_at, tz)}–${timeIn(b.ends_at, tz)}`
                        : b.booking_style === "arrive_by" && b.arrive_by
                          ? t("upcoming.arriveBy", {
                              time: timeIn(b.arrive_by, tz),
                            })
                          : timeIn(b.starts_at, tz)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {dayIn(b.starts_at, tz)}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {b.customer_name || b.guest_name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {bookingTitle(b)}
                      {b.guests
                        ? ` · ${t("public.tables.guestsLine", { count: b.guests })}${b.zones ? ` · ${b.zones}` : ""}`
                        : ""}{" "}
                      · {b.code}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={b.status} />
                    {!b.guests && <PaymentBadge b={b} />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <Pager
        meta={meta}
        page={page}
        onPage={(p) => set({ page: String(p) })}
        limit={limit}
        onLimit={(n) => set({ limit: String(n), page: "1" })}
      />
      <BookingSheet id={open} onClose={() => setOpen(null)} />
      {adding && (
        <NewBookingDialog
          start={{ date: today }}
          onClose={() => setAdding(false)}
          onCreated={(b) => {
            setAdding(false)
            setOpen(b.id)
          }}
        />
      )}
    </div>
  )
}

function Filter({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={label} className="h-11 w-40 lg:h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
