import {
  CalendarCheckIcon,
  CalendarPlusIcon,
  FileTextIcon,
  TicketIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router"

import { LanguageToggle } from "@/components/LanguageToggle"
import { Button } from "@/components/ui/button"
import type { PublicBranch } from "@/lib/api/types"
import { UserMenu } from "@/layouts/UserMenu"
import { useSession } from "@/stores/session"

import { ThemeToggle } from "./ThemeToggle"

export interface CustomerMenuItem {
  id: string
  to: string
  label: string
  icon: LucideIcon
  /** the page that is open */
  here: boolean
}

/**
 * The customer's menu, the one list used by the branch page and by My bookings / My packages / My account (top header
 * on a laptop, bottom menu on a phone): Booking, Policy (when the branch has one), My bookings, My packages (sport
 * branches, or when the branch is not known), My account. `business` is the branch the customer is looking at or came
 * from; `slug` null: they came from the list of all branches.
 */
export function useCustomerMenu(
  slug: string | null,
  business?: PublicBranch | null,
): CustomerMenuItem[] {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const home = slug ? `/b/${slug}` : "/"
  return [
    {
      id: "booking",
      to: slug ? `${home}#book` : "/",
      label: t("public.nav.booking"),
      icon: CalendarPlusIcon,
      here: pathname === home,
    },
    ...(business?.booking_policy
      ? [
          {
            id: "policy",
            to: `${home}#policy`,
            label: t("public.nav.policy"),
            icon: FileTextIcon,
            here: false,
          },
        ]
      : []),
    {
      id: "bookings",
      to: "/account",
      label: t("nav.myBookings"),
      icon: CalendarCheckIcon,
      here: pathname === "/account" || pathname.startsWith("/account/bookings"),
    },
    ...(!business || business.type === "sport"
      ? [
          {
            id: "packages",
            to: "/account/packages",
            label: t("nav.myPackages"),
            icon: TicketIcon,
            here: pathname.startsWith("/account/packages"),
          },
        ]
      : []),
    {
      id: "account",
      to: "/account/profile",
      label: t("nav.account"),
      icon: UserRoundIcon,
      here: pathname === "/account/profile",
    },
  ]
}

/**
 * The top bar of every customer page: the branch button (or the logo) on the left, the menu, then language, light /
 * dark and the profile. The same bar, with the same height and width, on the branch page and on the account pages.
 */
export function CustomerHeader({
  left,
  items,
}: {
  left: React.ReactNode
  items: CustomerMenuItem[]
}) {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const { pathname } = useLocation()
  const loginLink = `/login?next=${encodeURIComponent(pathname)}`
  return (
    <header className="pub-rainbow sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        {left}
        <nav className="ml-auto hidden auto-cols-fr grid-flow-col items-center gap-1 lg:grid">
          {items.map((s) => (
            <Button
              key={s.id}
              asChild
              variant="ghost"
              className="h-11 w-full px-4 aria-[current=page]:bg-muted aria-[current=page]:font-semibold"
            >
              <Link to={s.to} aria-current={s.here ? "page" : undefined}>
                {s.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <LanguageToggle />
          <ThemeToggle />
          {user ? (
            // logged in: the profile circle, whose menu has My bookings, All branches, My account
            <UserMenu allBranches />
          ) : (
            <Button asChild variant="outline" className="h-11 px-4">
              <Link to={loginLink}>{t("actions.logIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
