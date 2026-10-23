import { TicketIcon, UserRoundIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Outlet } from "react-router"

import { readOrigin } from "@/features/public/origin"
import { AppShell } from "@/layouts/AppShell"

/**
 * /account/*: the customer's own area (My bookings, My account). One layout for both pages, so the
 * menu stays put and its pill slides from one item to the other. The top-left arrow leads back to
 * the branch they came from, or to all branches when they came from nowhere.
 */
export function AccountLayout() {
  const { t } = useTranslation()
  const origin = readOrigin()
  return (
    <AppShell
      gooey
      back={
        origin
          ? { to: `/b/${origin.slug}`, label: origin.name }
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
