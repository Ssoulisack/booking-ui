import { useTranslation } from "react-i18next"
import { Navigate, NavLink, Outlet } from "react-router"

import { cn } from "@/lib/utils"

import { useDashboard } from "@/components/provider/dashboard-context"
import { setupTabs } from "@/lib/constants/setup-tabs"

/** /dashboard/:id/setup/* — what can be booked, when, and at what price (managers and the owner) */
export function SetupLayout() {
  const { t } = useTranslation()
  const context = useDashboard()
  return (
    <>
      <nav
        aria-label={t("nav.setup")}
        className="-mx-4 mb-6 no-scrollbar flex gap-1 overflow-x-auto border-b px-4 sm:-mx-6 sm:px-6"
      >
        {setupTabs(context.branch.type).map((tab) => (
          <NavLink
            key={tab}
            to={tab}
            className={({ isActive }) =>
              cn(
                "flex h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {t(`setup.tabs.${tab}`)}
          </NavLink>
        ))}
      </nav>
      <Outlet context={context} />
    </>
  )
}

/** /dashboard/:id/setup — the first tab for this kind of branch */
export function SetupIndex() {
  const { branch } = useDashboard()
  return <Navigate to={setupTabs(branch.type)[0]} replace />
}
