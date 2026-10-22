import { HomeIcon, TicketIcon, UserRoundIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { AppShell } from "@/layouts/AppShell"

/** The customer's own area: the brand home, My bookings and My account */
export function AccountShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <AppShell
      nav={[
        { to: "/", label: t("nav.home"), icon: HomeIcon, end: true },
        {
          to: "/account",
          label: t("nav.myBookings"),
          icon: TicketIcon,
          end: true,
        },
        {
          to: "/account/profile",
          label: t("nav.account"),
          icon: UserRoundIcon,
        },
      ]}
    >
      {children}
    </AppShell>
  )
}
