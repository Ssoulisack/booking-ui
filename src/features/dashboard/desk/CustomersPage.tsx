import { SearchIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { dayIn } from "@/lib/format"
import { displayPhone } from "@/lib/phone"

import { useSettings } from "../api"
import { PageHeader } from "../ui"
import { useCustomers } from "./api"

/** /dashboard/:id/customers — people with an account who booked here; open their bookings */
export function CustomersPage() {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const [search, setSearch] = useState("")
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const customers = useCustomers(keyword, page)
  const meta = customers.data?.meta

  return (
    <div className="space-y-4">
      <PageHeader title={t("nav.customers")} lead={t("desk.customersLead")} />
      <form
        className="relative max-w-md"
        onSubmit={(e) => {
          e.preventDefault()
          setKeyword(search.trim())
          setPage(1)
        }}
      >
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t("desk.search")}
          placeholder={t("desk.customerSearch")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!e.target.value) setKeyword("")
          }}
          className="h-11 pl-9 text-base lg:h-9 lg:text-sm"
        />
      </form>
      {customers.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : customers.isError ? (
        <PageError
          error={customers.error}
          onRetry={() => customers.refetch()}
        />
      ) : customers.data.items.length === 0 ? (
        <p className="rounded-xl bg-background p-6 text-muted-foreground ring-1 ring-border">
          {t("desk.noCustomers")}
        </p>
      ) : (
        <ul className="divide-y rounded-xl bg-background ring-1 ring-border">
          {customers.data.items.map((c) => (
            <li
              key={c.user_id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-48 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[c.member_no, c.phone && displayPhone(c.phone), c.email]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("desk.customerBookings", {
                  count: c.bookings,
                  last: dayIn(c.last_booking_at, tz),
                })}
              </p>
              <Button asChild variant="outline" className="h-11 lg:h-9">
                <Link to={`../bookings?customer=${c.user_id}`}>
                  {t("desk.seeBookings")}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {meta && meta.total_page > 1 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            className="h-11 lg:h-9"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {t("desk.previous")}
          </Button>
          <Button
            variant="outline"
            className="h-11 lg:h-9"
            disabled={page >= meta.total_page}
            onClick={() => setPage(page + 1)}
          >
            {t("desk.next")}
          </Button>
        </div>
      )}
    </div>
  )
}
