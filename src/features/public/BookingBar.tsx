import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import CountUp from "@/components/reactbits/CountUp"
import { Button } from "@/components/ui/button"

import { usePublic } from "./context"
import { selectionQuery, type Selection } from "./selection"

/** The currency symbol and where it goes, e.g. LAK → { before: "₭", after: "" } */
function currencyAffix(currency: string) {
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).formatToParts(1)
    const i = parts.findIndex((p) => p.type === "integer")
    const sym = (from: number, to: number) =>
      parts
        .slice(from, to)
        .map((p) => p.value)
        .join("")
    return { before: sym(0, i), after: sym(i + 1, parts.length) }
  } catch {
    return { before: "", after: ` ${currency}` }
  }
}

/**
 * Stuck to the bottom of the screen within thumb reach: what is chosen, the price (rolling to the
 * new amount when the length changes) and Book.
 */
export function BookingBar({
  summary,
  when,
  price,
  currency,
  checkout,
}: {
  summary: string
  when: string
  price?: number
  currency: string
  checkout: Selection
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { slug } = usePublic()
  const affix = currencyAffix(currency)

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{summary}</p>
          <p className="truncate text-sm text-muted-foreground">{when}</p>
        </div>
        {price !== undefined && (
          <p className="shrink-0 text-2xl display-tight tabular-nums">
            {affix.before}
            <CountUp
              to={price}
              from={price}
              separator=","
              mode="roll"
              duration={0.6}
              trigger="load"
            />
            {affix.after}
          </p>
        )}
        <Button
          size="lg"
          className="h-12 px-6 text-base"
          onClick={() =>
            navigate(`/b/${slug}/book?${selectionQuery(checkout)}`)
          }
        >
          {t("public.book")}
        </Button>
      </div>
    </div>
  )
}
