import { SearchIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { EmailNotVerifiedBadge } from "@/components/global/EmailVerify"
import { Link, useSearchParams } from "react-router"

import { PageError } from "@/components/global/page-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dayIn } from "@/lib/format"
import { displayPhone } from "@/lib/phone"

import { useSettings } from "@/hooks/use-branch"
import { PageHeader } from "@/components/protected/branch/ui"
import { Pager } from "@/components/global/Pager"

import { useCustomers, useMembers } from "@/hooks/use-customer"
import { MembersTable } from "./MembersTable"

/** /dashboard/:id/customers — people with an account who booked here; open their bookings */
export function CustomersPage() {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const [search, setSearch] = useState("")
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  // two tabs (in the address, ?tab=membership): everyone who booked here, and those who bought a package
  const [params, setParams] = useSearchParams()
  const membership = params.get("tab") === "membership"
  const switchTab = (v: string) => {
    setPage(1)
    setParams(v === "membership" ? { tab: "membership" } : {}, {
      replace: true,
    })
  }
  const customers = useCustomers(keyword, page, limit)
  const members = useMembers(keyword, page, limit)
  const shown = membership ? members : customers
  const meta = shown.data?.meta

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("nav.customers")}
        lead={t(membership ? "desk.membershipLead" : "desk.customersLead")}
      />
      <Tabs
        value={membership ? "membership" : "customers"}
        onValueChange={switchTab}
      >
        <TabsList className="h-11 lg:h-9">
          <TabsTrigger value="customers" className="px-4">
            {t("desk.tabCustomers")}
          </TabsTrigger>
          <TabsTrigger value="membership" className="px-4">
            {t("desk.tabMembership")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
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
      {membership ? (
        members.isPending ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : members.isError ? (
          <PageError error={members.error} onRetry={() => members.refetch()} />
        ) : members.data.items.length === 0 ? (
          <p className="rounded-xl bg-background p-6 text-muted-foreground ring-1 ring-border">
            {t("desk.noMembers")}
          </p>
        ) : (
          <MembersTable
            members={members.data.items}
            first={(page - 1) * limit + 1}
            tz={tz}
          />
        )
      ) : customers.isPending ? (
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
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {c.name}
                  <EmailNotVerifiedBadge
                    email={c.email}
                    verified={c.email_verified}
                  />
                </p>
                <p className="text-sm text-muted-foreground">
                  {[
                    c.member_no,
                    c.phone && displayPhone(c.phone),
                    c.email || t("company.noEmail"),
                  ]
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
      <Pager
        meta={meta}
        page={page}
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
