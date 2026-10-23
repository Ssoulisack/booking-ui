import { TicketIcon, UserRoundIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Outlet } from "react-router"

import { readBack } from "@/features/public/origin"
import { AppShell } from "@/layouts/AppShell"

/**
 * /account/*: the customer's own area (My bookings, My account). One layout for both pages, so the
 * menu stays put and its pill slides from one item to the other. The top-left arrow leads back to
 * the page before: a branch, or all branches (also when there was none).
 */
export function AccountLayout() {
  const { t } = useTranslation()
  const before = readBack()
  return (
    <AppShell
      gooey
      back={
        before?.name
          ? { to: before.to, label: before.name }
          : { to: "/", label: t("public.allBranches") }
      }
      nav={[
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
      <Outlet />
    </AppShell>
  )
}
