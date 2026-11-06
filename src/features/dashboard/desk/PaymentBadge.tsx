import { BanknoteIcon, CheckCircle2Icon, TicketIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { money } from "@/lib/format"
import type { Booking } from "@/lib/api/types"
import { cn } from "@/lib/utils"

type Pay = Pick<
  Booking,
  | "payment_status"
  | "payment_method"
  | "total_price"
  | "currency"
  | "status"
  | "package"
  | "package_code"
>

/**
 * Who has paid, at a glance: green PAID (with how), amber UNPAID with the amount to collect, blue for a booking
 * paid by a package. A cancelled booking that was never paid is grey, so it does not call for attention.
 * big = the banner version at the top of the booking dialog.
 */
export function PaymentBadge({ b, big = false }: { b: Pay; big?: boolean }) {
  const { t } = useTranslation()
  const amount = money(b.total_price, b.currency)
  const byPackage = b.payment_method === "package" || !!b.package
  let tone: string
  let icon = <BanknoteIcon className="size-3.5" />
  let text: string
  if (byPackage) {
    tone =
      "bg-sky-100 text-sky-900 ring-sky-300 dark:bg-sky-950 dark:text-sky-100 dark:ring-sky-800"
    icon = <TicketIcon className="size-3.5" />
    text =
      `${t("desk.methods.package")}${b.package ? ` · ${b.package_code ?? ""}` : ""}`.trim()
  } else if (b.payment_status === "paid") {
    tone =
      "bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-800"
    icon = <CheckCircle2Icon className="size-3.5" />
    text = big ? `${t("desk.paid")} · ${amount}` : `${t("desk.paid")} ${amount}`
  } else if (b.status === "cancelled") {
    tone = "bg-muted text-muted-foreground ring-border"
    text = `${t("desk.unpaid")} · ${amount}`
  } else {
    tone =
      "bg-amber-100 text-amber-950 ring-amber-400 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-700"
    text = big
      ? t("desk.unpaidToCollect", { amount })
      : `${t("desk.unpaid")} ${amount}`
  }
  return (
    <span
      data-payment={byPackage ? "package" : b.payment_status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1",
        big && "px-3 py-1.5 text-sm",
        tone,
      )}
    >
      {icon}
      {text}
    </span>
  )
}
