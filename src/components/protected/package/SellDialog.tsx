import { useQueryClient } from "@tanstack/react-query"
import { SearchIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { FormDialog } from "@/components/protected/branch/ui"
import { useFindCustomer } from "@/hooks/use-customer"
import { usePackages, useSellPackage } from "@/hooks/use-package"
import { money } from "@/lib/format"
import { optionLabel } from "@/lib/packages"
import { displayPhone } from "@/lib/phone"
import type { CustomerMatch } from "@/types/customer"
import type { CustomerPackage, PackageItem } from "@/types/package"

import { MethodPicker } from "./PackageDialogs"

const input = "h-11 text-base lg:h-9 lg:text-sm"
const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-2.5 text-base lg:h-9 lg:text-sm"

/** Sell a package to a customer who has an account; with a payment method it starts at once */
export function SellDialog({
  onClose,
  renew,
}: {
  onClose: () => void
  /** renew: sell the same package and option again to the same customer (only the payment is left to choose) */
  renew?: CustomerPackage
}) {
  const { t } = useTranslation()
  const packages = (usePackages().data ?? []).filter((p) => p.active)
  const [lookup, setLookup] = useState("")
  const find = useFindCustomer()
  // renewing: the customer is the one of the old package (no search)
  const account: CustomerMatch | undefined = renew
    ? {
        user_id: renew.customer_id,
        member_no: "",
        name: renew.customer_name ?? "",
        phone: renew.customer_phone ?? "",
      }
    : find.data
  const [packageId, setPackageId] = useState<number>(renew?.package_id ?? 0)
  const [optionId, setOptionId] = useState<number>(renew?.option_id ?? 0)
  const [method, setMethod] = useState<string>("cash")
  const [paidNow, setPaidNow] = useState(true)
  const [notes, setNotes] = useState("")
  const [missing, setMissing] = useState(false)
  const queryClient = useQueryClient()
  const sell = useSellPackage()

  const pkg: PackageItem | undefined =
    packages.find((p) => p.id === packageId) ?? packages[0]
  const options = pkg?.options.filter((o) => o.active) ?? []
  const option = options.find((o) => o.id === optionId) ?? options[0]
  // the package or the way it was bought is no longer on sale: say so, the first one on sale is offered instead
  const gone =
    !!renew &&
    !packages
      .find((p) => p.id === renew.package_id)
      ?.options.some((o) => o.id === renew.option_id && o.active)

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={renew ? t("packages.renewTitle") : t("packages.sell")}
      description={
        renew
          ? t("packages.renewLead", { code: renew.code })
          : t("packages.sellLead")
      }
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
          {!renew && (
            <>
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
                  <span className="sr-only">{t("desk.findCustomer")}</span>
                </Button>
              </div>
            </>
          )}
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

        {gone && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t("packages.renewGone")}
          </p>
        )}
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
