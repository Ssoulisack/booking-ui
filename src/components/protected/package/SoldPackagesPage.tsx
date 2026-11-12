import { PlusIcon, SearchIcon, SendIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { PageError } from "@/components/global/page-state"
import { RefreshButton } from "@/components/global/RefreshButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { CustomerPackageStatus } from "@/types/package"
import { dayIn, money } from "@/lib/format"
import { leftLabel, optionLabel, ymdLabel, statusLabel } from "@/lib/packages"
import { displayPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"

import { useSettings } from "@/hooks/use-branch"
import { PageHeader } from "@/components/protected/branch/ui"
import { useSoldPackages } from "@/hooks/use-package"
import { PackageActions } from "./PackageActions"
import { SellDialog } from "./SellDialog"
import { searchable } from "./PackageFinder"
import { statusTone } from "./PackageDialogs"

const STATUSES: CustomerPackageStatus[] = [
  "pending_payment",
  "active",
  "used_up",
  "expired",
  "cancelled",
]

/** /dashboard/:id/packages — what customers bought: sell at the desk, mark paid, adjust visits, see the log */
export function SoldPackagesPage() {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  // the search is the server's (words from the start, a phone typed any way, a code); a short pause while typing
  const [asked, setAsked] = useState("")
  useEffect(() => {
    const id = setTimeout(
      () => setAsked(searchable(search) ? search.trim() : ""),
      300,
    )
    return () => clearTimeout(id)
  }, [search])
  const sold = useSoldPackages({ status, q: asked })
  const [selling, setSelling] = useState(false)

  const rows = sold.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("packages.soldTitle")}
        lead={t("packages.soldLead")}
        actions={
          <>
            <RefreshButton
              fetching={sold.isFetching}
              updatedAt={sold.dataUpdatedAt}
              onRefresh={() => void sold.refetch()}
            />
            <Button className="h-11 lg:h-9" onClick={() => setSelling(true)}>
              <PlusIcon />
              {t("packages.sell")}
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("desk.search")}
            placeholder={t("packages.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-9 text-base lg:h-9 lg:text-sm"
          />
        </div>
        <select
          aria-label={t("packages.statusFilter")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 rounded-lg border border-input bg-background px-2.5 text-base lg:h-9 lg:text-sm"
        >
          <option value="">{t("packages.allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`packages.status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {sold.isPending ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : sold.isError ? (
        <PageError error={sold.error} onRetry={() => sold.refetch()} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-background p-6 text-muted-foreground ring-1 ring-border">
          {t("packages.noneSold")}
        </p>
      ) : (
        // a phone scrolls the table sideways inside its box
        <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[58rem] text-sm">
            <thead className="border-b text-left whitespace-nowrap text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.colCode")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.colCustomer")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.colPackage")}
                </th>
                <th className="py-2 pr-3 text-right font-medium">
                  {t("packages.price")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.colLeft")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.colPayment")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.statusFilter")}
                </th>
                <th className="py-2 font-medium">
                  <span className="sr-only">{t("packages.colActions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <span className="block font-mono text-xs font-semibold">
                      {p.code}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {dayIn(p.created_at, tz)}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="block font-medium whitespace-nowrap">
                      {p.customer_name}
                    </span>
                    <span className="block text-xs whitespace-nowrap text-muted-foreground">
                      {p.customer_phone && displayPhone(p.customer_phone)}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="block font-medium whitespace-nowrap">
                      {p.name}
                    </span>
                    <span className="block text-xs whitespace-nowrap text-muted-foreground">
                      {optionLabel(t, p)}
                      {p.resource_name && ` · ${p.resource_name}`}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right whitespace-nowrap tabular-nums">
                    {money(p.price, p.currency)}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {p.payment_status === "paid" && p.status !== "cancelled" ? (
                      <>
                        <span className="block font-medium">
                          {leftLabel(t, p, ymdLabel)}
                        </span>
                        {p.kind === "times" && p.expires_on && (
                          <span className="block text-xs text-muted-foreground">
                            {t("packages.useBy", {
                              day: ymdLabel(p.expires_on),
                            })}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    {p.payment_status === "paid" ? (
                      <span className="block whitespace-nowrap">
                        {t("packages.paidWith", {
                          method: t(
                            `desk.methods.${(p.payment_method || "other") as "cash"}`,
                          ),
                        })}
                      </span>
                    ) : (
                      <span className="block font-medium whitespace-nowrap text-amber-700 dark:text-amber-300">
                        {t("packages.unpaid")}
                      </span>
                    )}
                    {p.slip_sent_at && p.payment_status !== "paid" && (
                      <span className="mt-1 flex max-w-56 items-start gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium ring-1 ring-primary/30">
                        <SendIcon className="mt-0.5 size-3 shrink-0" />
                        {p.slip_via === "telegram"
                          ? t("packages.slipTelegram")
                          : t("packages.slipWhatsapp")}
                      </span>
                    )}
                    {p.sold_by === "staff" && (
                      <span className="block text-xs text-muted-foreground">
                        {t("packages.soldAtDesk")}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <Badge className={cn("border-0", statusTone(p.status))}>
                      {statusLabel(t, p, true)}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <PackageActions pkg={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selling && <SellDialog onClose={() => setSelling(false)} />}
    </div>
  )
}
