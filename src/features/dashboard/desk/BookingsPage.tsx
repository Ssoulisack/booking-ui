import { PlusIcon, SearchIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"

import { PageError } from "@/components/page-state"
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
import { StatusBadge } from "@/features/public/BookingCard"
import { bookingTitle } from "@/features/public/booking-utils"
import { dayIn, money, nextDays, timeIn, todayIn } from "@/lib/format"

import { useSettings } from "../api"
import { PageHeader } from "../ui"
import { useBookingList, type BookingFilters } from "./api"
import { BookingSheet } from "./BookingSheet"
import { NewBookingDialog } from "./NewBookingDialog"

const STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
] as const
const PERIODS = ["today", "tomorrow", "week", "custom"] as const

/** /dashboard/:id/bookings — find and handle bookings; filters live in the address */
export function BookingsPage() {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState(params.get("q") ?? "")

  const today = todayIn(tz)
  const period = (params.get("period") ?? "today") as (typeof PERIODS)[number]
  const range =
    period === "today"
      ? { from: today, to: today }
      : period === "tomorrow"
        ? { from: nextDays(tz, 2)[1], to: nextDays(tz, 2)[1] }
        : period === "week"
          ? { from: today, to: nextDays(tz, 7)[6] }
          : { from: params.get("from") ?? today, to: params.get("to") ?? today }
  const page = Number(params.get("page") ?? 1)
  const filters: BookingFilters = {
    // a search or one customer's history looks at every date
    ...(params.get("q") || params.get("customer") ? {} : range),
    keyword: params.get("q") || undefined,
    status: params.get("status") || undefined,
    payment_status: params.get("pay") || undefined,
    customer_id: Number(params.get("customer")) || undefined,
    page,
    limit: 25,
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
        actions={
          <Button className="h-11 lg:h-9" onClick={() => setAdding(true)}>
            <PlusIcon />
            {t("desk.newBooking")}
          </Button>
        }
      />
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
        <Filter
          label={t("desk.period")}
          value={period}
          onChange={(v) => set({ period: v })}
          options={PERIODS.map((p) => ({
            value: p,
            label: t(`desk.periods.${p}`),
          }))}
        />
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
          {t("desk.noBookings")}
        </p>
      ) : (
        <ul className="divide-y rounded-xl bg-background ring-1 ring-border">
          {list.data.items.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setOpen(b.id)}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-muted/50 sm:flex-nowrap"
              >
                <span className="w-32 shrink-0">
                  <span className="block font-medium tabular-nums">
                    {timeIn(b.starts_at, tz)}–{timeIn(b.ends_at, tz)}
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
                    {bookingTitle(b)} · {b.code}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={b.status} />
                  <Badge
                    variant={
                      b.payment_status === "paid" ? "outline" : "secondary"
                    }
                  >
                    {money(b.total_price, b.currency)} ·{" "}
                    {t(`desk.${b.payment_status}`)}
                  </Badge>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {meta && meta.total_page > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {t("desk.pageOf", {
              page: meta.page,
              pages: meta.total_page,
              total: meta.total,
            })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              disabled={page <= 1}
              onClick={() => set({ page: String(page - 1) })}
            >
              {t("desk.previous")}
            </Button>
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              disabled={page >= meta.total_page}
              onClick={() => set({ page: String(page + 1) })}
            >
              {t("desk.next")}
            </Button>
          </div>
        </div>
      )}
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
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <Select value={value} onValueChange={onChange}>
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
