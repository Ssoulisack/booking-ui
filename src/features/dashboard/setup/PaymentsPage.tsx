import { useTranslation } from "react-i18next"

import { PayInfoPanel } from "./PayInfoPanel"

/**
 * /setup/payments — how customers of a sport branch pay: online (bank app QR) for bookings and packages, the branch's
 * own QR or bank account, and how the payment slip is sent. It used to sit at the bottom of the Packages page, where it
 * was mistaken for a package setting.
 */
export function PaymentsPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm text-muted-foreground">{t("setup.paymentsLead")}</p>
      <PayInfoPanel />
    </div>
  )
}
