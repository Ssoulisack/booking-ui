import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { SearchIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"

import { PageError, PageTitle } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { bookingApi, publicKeys } from "@/features/public/api"
import { BookingCard } from "@/features/public/BookingCard"
import { canCancel, zoneOf } from "@/features/public/booking-utils"
import { CancelDialog } from "@/features/public/CancelDialog"
import { ContinuePayment } from "@/features/public/ContinuePayment"
import { readOriginSlug } from "@/features/public/origin"
import type { Booking } from "@/lib/api/types"
import { dayIn, timeIn, todayIn } from "@/lib/format"
import { cn } from "@/lib/utils"

import { AddBookingDialog } from "./AddBookingDialog"

/** /account — the customer's bookings at every branch, with a branch filter once there are two */
export function AccountPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")
  // null: not chosen yet, so the branch the customer came from is shown (Music Bar → its bookings first);
  // "" is a choice too: all branches
  const [picked, setPicked] = useState<string | null>(null)
  // find one booking: by (part of) its code, and/or by the day it is on
  const [code, setCode] = useState("")
  const [day, setDay] = useState("")
  const searching = code.trim() !== "" || day !== ""
  const bookings = useQuery({
    queryKey: publicKeys.myBookings,
    queryFn: () => bookingApi.myBookings(),
    // approvals, payments and cancellations by the team show up without a reload
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })

  // the moment the page opened splits upcoming from past
  const [now] = useState(() => Date.now())
  const upcoming = (bookings.data?.items ?? [])
    .filter(
      (b) =>
        (b.status === "pending" || b.status === "confirmed") &&
        Date.parse(b.ends_at) > now,
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const past = (bookings.data?.items ?? []).filter((b) => !upcoming.includes(b))
  const all = bookings.data?.items ?? []
  const came = readOriginSlug()
  // the branch they came from, when they have bookings there; a search looks everywhere until a branch is picked
  const branch =
    picked ??
    (!searching && came && all.some((b) => b.branch_slug === came) ? came : "")
  const setBranch = setPicked
  // searching looks at every booking, upcoming or past; otherwise the tab decides
  const matches = (b: Booking) =>
    (!branch || b.branch_slug === branch) &&
    (code.trim() === "" ||
      b.code.toLowerCase().includes(code.trim().toLowerCase())) &&
    (day === "" || todayIn(zoneOf(b.starts_at), new Date(b.starts_at)) === day)
  const shown = searching
    ? all
        .filter(matches)
        .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
    : (tab === "upcoming" ? upcoming : past).filter(matches)
  // every branch this person has booked at, by name
  const branches = [
    ...new Map(
      (bookings.data?.items ?? []).map((b) => [b.branch_slug, b.branch_name]),
    ),
  ].sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <>
      <div className="mx-auto max-w-2xl">
        <PageTitle title={t("account.title")} />
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="relative min-w-0 flex-1 basis-56">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("account.searchCode")}
              aria-label={t("account.searchCode")}
              autoCapitalize="characters"
              autoComplete="off"
              className="h-11 pl-9 text-base uppercase placeholder:normal-case lg:text-sm"
            />
          </div>
          <Input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            aria-label={t("account.day")}
            className="h-11 w-44 text-base lg:text-sm"
          />
          {searching && (
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={() => {
                setCode("")
                setDay("")
              }}
            >
              <XIcon />
              {t("account.clearFilters")}
            </Button>
          )}
          <AddBookingDialog />
        </div>
        {searching && (
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
            {t("account.found", { count: shown.length })}
          </p>
        )}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList
            className={cn("mb-4 h-11 w-full sm:w-auto", searching && "hidden")}
          >
            <TabsTrigger value="upcoming" className="h-9 px-4">
              {t("account.upcoming", {
                count: upcoming.filter(
                  (b) => !branch || b.branch_slug === branch,
                ).length,
              })}
            </TabsTrigger>
            <TabsTrigger value="past" className="h-9 px-4">
              {t("account.past")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {branches.length > 1 && (
          <div
            role="group"
            aria-label={t("account.branch")}
            className="-mx-4 mb-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {[["", t("account.allBranches")], ...branches].map(
              ([slug, name]) => (
                <button
                  key={slug || "all"}
                  type="button"
                  aria-pressed={branch === slug}
                  onClick={() => setBranch(slug)}
                  className={cn(
                    "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                    branch === slug
                      ? "border-foreground bg-foreground text-background"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  {name}
                </button>
              ),
            )}
          </div>
        )}
        {bookings.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        ) : bookings.isError ? (
          <PageError
            error={bookings.error}
            onRetry={() => bookings.refetch()}
          />
        ) : shown.length === 0 ? (
          <p className="rounded-xl bg-card p-6 text-muted-foreground">
            {searching
              ? t("account.noMatch")
              : tab === "upcoming"
                ? t("account.noUpcoming")
                : t("account.noPast")}
          </p>
        ) : (
          <div className="space-y-3">
            {shown.map((b) => (
              <MyBooking key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function MyBooking({ booking }: { booking: Booking }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const cancel = useMutation({
    mutationFn: (reason: string) => bookingApi.cancelMine(booking.id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publicKeys.myBookings })
      void queryClient.invalidateQueries({
        queryKey: ["public", booking.branch_slug],
      })
      toast.success(t("booking.cancelled"))
    },
  })
  const zone = zoneOf(booking.cancellable_until)

  return (
    <BookingCard booking={booking} showBusiness>
      {/* left the pay page? carry on while there is time */}
      <div className="mt-4 empty:hidden">
        <ContinuePayment booking={booking} />
      </div>
      <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="outline" className="h-11">
          <Link to={`/b/${booking.branch_slug}`}>
            {t("account.openBusiness")}
          </Link>
        </Button>
        {canCancel(booking) && (
          <div className="flex flex-col gap-1 sm:items-end">
            <CancelDialog
              pending={cancel.isPending}
              error={cancel.error}
              onConfirm={(reason) => cancel.mutate(reason)}
            />
            <span className="text-xs text-muted-foreground">
              {t("booking.cancelUntil", {
                when: `${dayIn(booking.cancellable_until, zone)}, ${timeIn(booking.cancellable_until, zone)}`,
              })}
            </span>
          </div>
        )}
      </div>
    </BookingCard>
  )
}
