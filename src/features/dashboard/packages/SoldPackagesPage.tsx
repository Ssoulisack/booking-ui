import { useQueryClient } from "@tanstack/react-query"
import { PlusIcon, SearchIcon, SendIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { PageError } from "@/components/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { CustomerPackageStatus, PackageItem } from "@/lib/api/types"
import { dayIn, money } from "@/lib/format"
import { leftLabel, optionLabel, ymdLabel } from "@/lib/packages"
import { displayPhone } from "@/lib/phone"
import {} from "@/lib/roles"
import { cn } from "@/lib/utils"

import { useChange, useSettings } from "../api"
import { useFindCustomer } from "../desk/api"
import { PageHeader, FormDialog } from "../ui"
import { packageApi, usePackages, useSoldPackages } from "./api"
import { PackageActions } from "./PackageActions"
import { searchable } from "./PackageFinder"
import { MethodPicker, statusTone } from "./PackageDialogs"

const STATUSES: CustomerPackageStatus[] = [
  "pending_payment",
  "active",
  "used_up",
  "expired",
  "cancelled",
]
const input = "h-11 text-base lg:h-9 lg:text-sm"
const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-2.5 text-base lg:h-9 lg:text-sm"

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
          <Button className="h-11 lg:h-9" onClick={() => setSelling(true)}>
            <PlusIcon />
            {t("packages.sell")}
          </Button>
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
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
                      {t(`packages.status.${p.status}`)}
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

/** Sell a package to a customer who has an account; with a payment method it starts at once */
function SellDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const packages = (usePackages().data ?? []).filter((p) => p.active)
  const [lookup, setLookup] = useState("")
  const find = useFindCustomer()
  const account = find.data
  const [packageId, setPackageId] = useState<number>(0)
  const [optionId, setOptionId] = useState<number>(0)
  const [method, setMethod] = useState<string>("cash")
  const [paidNow, setPaidNow] = useState(true)
  const [notes, setNotes] = useState("")
  const [missing, setMissing] = useState(false)
  const queryClient = useQueryClient()
  const sell = useChange(packageApi.sell, ["sold-packages"])

  const pkg: PackageItem | undefined =
    packages.find((p) => p.id === packageId) ?? packages[0]
  const options = pkg?.options.filter((o) => o.active) ?? []
  const option = options.find((o) => o.id === optionId) ?? options[0]

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("packages.sell")}
      description={t("packages.sellLead")}
      submitLabel={t("packages.sellSubmit")}
      pending={sell.isPending}
      error={sell.error}
      onSubmit={(e) => {
        e.preventDefault()
        if (!account || !pkg || !option) {
          setMissing(true)
          return
        }
        sell.mutate(
          {
            customer_id: account.user_id,
            package_id: pkg.id,
            option_id: option.id,
            payment_method: paidNow ? method : "",
            notes: notes.trim(),
          },
          {
            onSuccess: () => {
              toast.success(t("packages.sold"))
              void queryClient.invalidateQueries({
                queryKey: ["me", "packages"],
              })
              onClose()
            },
          },
        )
      }}
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="sp-account">{t("desk.findAccount")}</Label>
          <div className="flex gap-2">
            <Input
              id="sp-account"
              value={lookup}
              aria-invalid={(missing && !account) || undefined}
              onChange={(e) => {
                setLookup(e.target.value)
                find.reset()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  if (lookup.trim()) find.mutate(lookup.trim())
                }
              }}
              className={input}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 lg:h-9"
              disabled={!lookup.trim() || find.isPending}
              onClick={() => find.mutate(lookup.trim())}
            >
              {find.isPending ? <Spinner /> : <SearchIcon />}
              <span className="sr-only">{t("desk.search")}</span>
            </Button>
          </div>
          {account ? (
            <p className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="block font-medium">{account.name}</span>
              <span className="text-muted-foreground">
                {[
                  account.member_no,
                  account.phone && displayPhone(account.phone),
                  account.email,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </p>
          ) : (
            <ErrorAlert error={find.error} />
          )}
        </div>

        {packages.length === 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t("packages.nothingToSell")}
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="sp-package">{t("packages.package")}</Label>
              <select
                id="sp-package"
                value={pkg?.id ?? ""}
                onChange={(e) => {
                  setPackageId(Number(e.target.value))
                  setOptionId(0)
                }}
                className={selectClass}
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-option">{t("packages.pick")}</Label>
              <select
                id="sp-option"
                value={option?.id ?? ""}
                onChange={(e) => setOptionId(Number(e.target.value))}
                className={selectClass}
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {optionLabel(t, o)} · {money(o.price, pkg!.currency)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={paidNow}
            onChange={(e) => setPaidNow(e.target.checked)}
            className="size-5 accent-primary"
          />
          <span className="text-sm font-medium">{t("packages.paidNow")}</span>
        </label>
        {paidNow ? (
          <MethodPicker name="sp-method" value={method} onChange={setMethod} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("packages.notPaidHint")}
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="sp-notes">{t("packages.notes")}</Label>
          <Textarea
            id="sp-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </FormDialog>
  )
}
