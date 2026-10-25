import { AlertTriangleIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { ScheduleOwner } from "@/lib/api/types"
import { duration, money } from "@/lib/format"

import { useUnsaved } from "@/stores/unsaved"
import { manage, useChange, useEffectiveRule, usePrice } from "../api"
import { Panel } from "../ui"
import { bookableLengths, priceFor } from "./shared"

/** Which booking rule applies to the owner: a space's own (and its sport's), a coach's sport */
export interface RuleScope {
  sport_id?: number
  resource_id?: number
}

/**
 * Price per hour of a space or coach, in the business currency, with what the lengths people can
 * book (from the booking rule in force) will cost
 */
export function PriceEditor({
  owner,
  id,
  currency,
  rule,
}: {
  owner: ScheduleOwner
  id: number
  currency: string
  rule: RuleScope
}) {
  const price = usePrice(owner, id)
  if (price.isPending) return <Skeleton className="h-36 rounded-xl" />
  if (price.isError) return <ErrorAlert error={price.error} />
  return (
    <PriceForm
      owner={owner}
      id={id}
      currency={currency}
      rule={rule}
      initial={price.data?.price_per_hour ?? null}
    />
  )
}

function PriceForm({
  owner,
  id,
  currency,
  rule,
  initial,
}: {
  owner: ScheduleOwner
  id: number
  currency: string
  rule: RuleScope
  initial: number | null
}) {
  const { t } = useTranslation()
  const inForce = useEffectiveRule(rule)
  // until the rule is known (or if it cannot be read): just one hour
  const lengths = inForce.data ? bookableLengths(inForce.data) : [60]
  const [value, setValue] = useState(initial === null ? "" : String(initial))
  const save = useChange(manage.savePrice, ["price"])
  useUnsaved(value !== (initial === null ? "" : String(initial)))
  const amount = Number(value)
  const valid = value.trim() !== "" && Number.isInteger(amount) && amount >= 0

  return (
    <Panel title={t("setup.price.title")} lead={t("setup.price.lead")}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          save.mutate(
            { owner, id, price_per_hour: amount, currency },
            { onSuccess: () => toast.success(t("setup.price.saved")) },
          )
        }}
      >
        {initial === null && (
          <p className="flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangleIcon className="size-4" />
            {t("setup.price.notSet")}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor={`price-${owner}-${id}`}>
            {t("setup.price.perHour", { currency })}
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={`price-${owner}-${id}`}
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
              className="h-11 w-48 text-base lg:h-9 lg:text-sm"
            />
            {valid && (
              <span className="text-sm text-muted-foreground">
                {lengths
                  .map((m) =>
                    m === null
                      ? "…"
                      : t("setup.price.lengthPrice", {
                          length: duration(m),
                          price: money(priceFor(amount, m), currency),
                        }),
                  )
                  .join(" · ")}
              </span>
            )}
          </div>
        </div>
        <ErrorAlert error={save.error} />
        <Button
          type="submit"
          className="h-11 lg:h-9"
          disabled={!valid || save.isPending || amount === initial}
        >
          {save.isPending && <Spinner />}
          {t("setup.price.save")}
        </Button>
      </form>
    </Panel>
  )
}
