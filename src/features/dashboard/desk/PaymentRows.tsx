import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import type { OnlinePaymentStatus, StaffPayment } from "@/lib/api/types"
import { dayIn, money, timeIn } from "@/lib/format"

import { DeleteButton } from "../ui"
import { useRefundPayment } from "./api"

/** Banks with a logo in public/banks */
const BANK_LOGOS = new Set([
  "apb",
  "bcel",
  "ib",
  "jdb",
  "ldb",
  "m-money",
  "stb",
])

const TONE: Record<
  OnlinePaymentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  paid: "default",
  expired: "secondary",
  failed: "secondary",
  mismatch: "destructive",
  refund_due: "destructive",
  disputed: "destructive",
  refund_requested: "secondary",
  refunded: "secondary",
}

/** The payments a team member can give back: paid ones, and money that arrived for a closed booking */
const canRefund = (p: StaffPayment) =>
  p.status === "paid" || p.status === "refund_due"

/** One online payment: bank, amount, how it stands, and Refund when it can be given back */
export function PaymentRow({
  payment: p,
  tz,
  extra,
}: {
  payment: StaffPayment
  tz: string
  /** what to show before the status (e.g. the booking code in the attention list) */
  extra?: React.ReactNode
}) {
  const { t } = useTranslation()
  const refund = useRefundPayment()
  const [open, setOpen] = useState(false)
  const when = p.paid_at ?? p.created_at
  // the customer changed bank: show every bank they tried, oldest first
  const tried = [...(p.charges ?? [])]
    .reverse()
    .filter((c) => c.status !== "failed")
    .map((c) =>
      c.method === "link" ? t("payOnline.otherBank") : c.method.toUpperCase(),
    )
  return (
    <li className="space-y-1.5 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {extra}
            {BANK_LOGOS.has(p.method) && (
              <img
                src={`/banks/${p.method}.png`}
                alt=""
                className="mr-1.5 inline-block h-5 w-auto align-text-bottom"
              />
            )}
            {p.method === "link"
              ? t("payOnline.otherBank")
              : p.method.toUpperCase()}
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              {money(p.amount, p.currency)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {p.order_no} · {dayIn(when, tz)} {timeIn(when, tz)}
          </p>
        </div>
        <Badge variant={TONE[p.status]}>{t(`payStatus.${p.status}`)}</Badge>
        {canRefund(p) && (
          <DeleteButton
            what={p.order_no}
            label={t("payStatus.refund")}
            title={t("payStatus.refundTitle", {
              amount: money(p.amount, p.currency),
            })}
            description={t("payStatus.refundConfirm")}
            open={open}
            onOpenChange={setOpen}
            pending={refund.isPending}
            error={refund.error}
            onConfirm={() =>
              refund.mutate(p.id, {
                onSuccess: () => {
                  setOpen(false)
                  toast.success(t("payStatus.refundAsked"))
                },
              })
            }
          />
        )}
      </div>
      {tried.length > 1 && (
        <p className="text-xs text-muted-foreground">
          {t("payStatus.banksTried", {
            count: tried.length,
            banks: tried.join(" → "),
          })}
        </p>
      )}
      {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
    </li>
  )
}
