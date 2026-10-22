import { SearchIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { PageError } from "@/components/page-state"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader } from "@/features/dashboard/ui"
import { dayIn } from "@/lib/format"
import { displayPhone } from "@/lib/phone"

import { useCompany, useCompanyCustomers } from "./api"
import { Pager } from "./ui"

/** /company/customers — everyone with an account who booked at any branch */
export function CustomersPage() {
  const { t } = useTranslation()
  const tz = useCompany().data?.timezone ?? "Asia/Vientiane"
  const [search, setSearch] = useState("")
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const customers = useCompanyCustomers({ keyword, page })

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("nav.customers")}
        lead={t("company.customersLead")}
      />
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
          aria-label={t("company.search")}
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
        <EmptyState text={t("desk.noCustomers")} />
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
            </li>
          ))}
        </ul>
      )}
      <Pager meta={customers.data?.meta} page={page} onPage={setPage} />
    </div>
  )
}
