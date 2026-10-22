import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"

import { PageError, PageTitle } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { bookingApi, publicKeys } from "@/features/public/api"
import { BookingCard } from "@/features/public/BookingCard"
import { canCancel, zoneOf } from "@/features/public/booking-utils"
import { CancelDialog } from "@/features/public/CancelDialog"
import type { Booking } from "@/lib/api/types"
import { dayIn, timeIn } from "@/lib/format"
import { cn } from "@/lib/utils"

import { AccountShell } from "./AccountShell"

/** /account — the customer's bookings at every branch, with a branch filter once there are two */
export function AccountPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")
  const [branch, setBranch] = useState("")
  const bookings = useQuery({
    queryKey: publicKeys.myBookings,
    queryFn: () => bookingApi.myBookings(),
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
  const shown = (tab === "upcoming" ? upcoming : past).filter(
    (b) => !branch || b.branch_slug === branch,
  )
  // every branch this person has booked at, by name
  const branches = [
    ...new Map(
      (bookings.data?.items ?? []).map((b) => [b.branch_slug, b.branch_name]),
    ),
  ].sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <AccountShell>
      <div className="mx-auto max-w-2xl">
        <PageTitle title={t("account.title")} />
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="mb-4 h-11 w-full sm:w-auto">
            <TabsTrigger value="upcoming" className="h-9 px-4">
              {t("account.upcoming", { count: upcoming.length })}
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
          <p className="rounded-xl bg-white p-6 text-muted-foreground">
            {tab === "upcoming" ? t("account.noUpcoming") : t("account.noPast")}
          </p>
        ) : (
          <div className="space-y-3">
            {shown.map((b) => (
              <MyBooking key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </AccountShell>
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
