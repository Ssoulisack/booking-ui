import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { useSettings } from "@/hooks/use-branch"
import { BookingSheet } from "@/components/protected/desk/BookingSheet"
import { usePaymentsAttention } from "@/hooks/use-payment"
import { PaymentRow } from "@/components/protected/desk/PaymentRows"
import { Panel } from "./ui"

/**
 * Online payments that need a person: money to give back (a booking that was cancelled, or paid twice),
 * an amount that did not match, a dispute, a refund in progress. Managers only; hidden when empty.
 */
export function PaymentsAttention() {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const list = usePaymentsAttention()
  const [open, setOpen] = useState<number | null>(null)
  if (!list.data?.length) return null
  return (
    <Panel
      title={t("payStatus.attentionTitle")}
      lead={t("payStatus.attentionLead")}
    >
      <ul className="divide-y">
        {list.data.map((p) => (
          <PaymentRow
            key={p.id}
            payment={p}
            tz={tz}
            extra={
              <Button
                type="button"
                variant="link"
                className="mr-2 h-auto p-0 align-baseline"
                onClick={() => setOpen(p.booking_id)}
              >
                {p.order_no}
              </Button>
            }
          />
        ))}
      </ul>
      <BookingSheet id={open} onClose={() => setOpen(null)} />
    </Panel>
  )
}
