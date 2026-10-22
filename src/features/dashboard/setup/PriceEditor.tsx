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
import { money } from "@/lib/format"

import { manage, useChange, usePrice } from "../api"
import { Panel } from "../ui"

/** Price per hour of a court or coach, in the business currency */
export function PriceEditor({
  owner,
  id,
  currency,
}: {
  owner: ScheduleOwner
  id: number
  currency: string
}) {
  const price = usePrice(owner, id)
  if (price.isPending) return <Skeleton className="h-36 rounded-xl" />
  if (price.isError) return <ErrorAlert error={price.error} />
  return (
    <PriceForm
      owner={owner}
      id={id}
      currency={currency}
      initial={price.data?.price_per_hour ?? null}
    />
  )
}

function PriceForm({
  owner,
  id,
  currency,
  initial,
}: {
  owner: ScheduleOwner
  id: number
  currency: string
  initial: number | null
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState(initial === null ? "" : String(initial))
  const save = useChange(manage.savePrice, ["price"])
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
                {t("setup.price.example", {
                  price: money(Math.round(amount * 1.5), currency),
                })}
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
