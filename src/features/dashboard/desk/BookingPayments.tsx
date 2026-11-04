import { useTranslation } from "react-i18next"

import { useSettings } from "../api"
import { useBookingPayments } from "./api"
import { PaymentRow } from "./PaymentRows"

/** The online payment attempts of one booking, inside its popup; nothing when none was made */
export function BookingPayments({ bookingId }: { bookingId: number }) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const list = useBookingPayments(bookingId)
  if (!list.data?.length) return null
  return (
    <section className="space-y-1 rounded-xl border p-4">
      <h3 className="text-sm font-medium">{t("payStatus.title")}</h3>
      <ul className="divide-y">
        {list.data.map((p) => (
          <PaymentRow key={p.id} payment={p} tz={tz} />
        ))}
      </ul>
    </section>
  )
}
