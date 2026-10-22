import {
  BarChart3Icon,
  Building2Icon,
  CalendarDaysIcon,
  ClipboardListIcon,
  HandCoinsIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersRoundIcon,
  WrenchIcon,
} from "lucide-react"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, Outlet, useLocation, useParams } from "react-router"

import { PageLoader, PageError } from "@/components/page-state"
import { usableBranches, useMyBranches } from "@/features/auth/api"
import type { BranchRole } from "@/lib/api/types"
import { roleAtLeast } from "@/lib/roles"
import { AppShell, type NavItem } from "@/layouts/AppShell"
import { EndSession } from "@/routes/guards"
import { useCurrentBranch } from "@/stores/branch"
import { runsCompany, useSession } from "@/stores/session"

import { BranchSwitcher } from "./BranchSwitcher"
import { useDashboard, type DashboardContext } from "./context"

/** /dashboard: open the remembered branch, or the first one this person can use */
export function DashboardIndex() {
  const user = useSession((s) => s.user)
  const currentId = useCurrentBranch((s) => s.currentId)
  const branches = useMyBranches()

  if (branches.isPending) return <PageLoader />
  if (branches.isError) {
    return (
      <PageError error={branches.error} onRetry={() => branches.refetch()} />
    )
  }

  const usable = usableBranches(branches.data)
  if (usable.length === 0) {
    if (runsCompany(user)) return <Navigate to="/company" replace />
    // every place they worked was switched off or closed: back to login with the reason
    if (branches.data.length > 0) {
      const closed = branches.data.every((b) => b.status === "closed")
      return (
        <EndSession reason={closed ? "BRANCH_CLOSED" : "MEMBERSHIP_DISABLED"} />
      )
    }
    return <Navigate to="/" replace />
  }

  const pick = usable.find((b) => b.branch_id === currentId) ?? usable[0]
  return <Navigate to={`/dashboard/${pick.branch_id}`} replace />
}

const NAV: Array<
  Omit<NavItem, "to" | "label"> & { path: string; key: string; min: BranchRole }
> = [
  {
    path: "",
    key: "overview",
    icon: LayoutDashboardIcon,
    min: "staff",
    end: true,
  },
  { path: "calendar", key: "calendar", icon: CalendarDaysIcon, min: "staff" },
  { path: "bookings", key: "bookings", icon: ClipboardListIcon, min: "staff" },
  { path: "customers", key: "customers", icon: UsersRoundIcon, min: "staff" },
  { path: "cash-up", key: "cashUp", icon: HandCoinsIcon, min: "staff" },
  { path: "setup", key: "setup", icon: WrenchIcon, min: "manager" },
  { path: "reports", key: "reports", icon: BarChart3Icon, min: "manager" },
  { path: "settings", key: "branchSettings", icon: SettingsIcon, min: "admin" },
]

/**
 * /dashboard/:branchId — for the people who work at the branch, and for the owner and admins at
 * every branch. The branch list is re-read on every page change (and after a MEMBERSHIP_DISABLED
 * or BRANCH_CLOSED answer), so someone switched off is sent away on the next click.
 */
export function DashboardLayout() {
  const { t } = useTranslation()
  const { branchId } = useParams()
  const { pathname } = useLocation()
  const user = useSession((s) => s.user)
  const branches = useMyBranches()
  const { refetch } = branches
  const setCurrentId = useCurrentBranch((s) => s.setCurrentId)

  // re-check access on every dashboard page change
  useEffect(() => {
    void refetch({ cancelRefetch: false })
  }, [pathname, refetch])

  const branch = usableBranches(branches.data).find(
    (b) => String(b.branch_id) === branchId,
  )

  useEffect(() => {
    if (branch) setCurrentId(branch.branch_id)
  }, [branch, setCurrentId])

  if (branches.isPending) return <PageLoader />
  if (branches.isError) {
    return (
      <PageError error={branches.error} onRetry={() => branches.refetch()} />
    )
  }
  if (!branch) return <Navigate to="/dashboard" replace />

  const base = `/dashboard/${branch.branch_id}`
  const nav: NavItem[] = NAV.filter((item) =>
    roleAtLeast(branch.role, item.min),
  ).map(({ path, key, icon, end }) => ({
    to: path ? `${base}/${path}` : base,
    label: t(`nav.${key}`),
    icon,
    end,
  }))
  if (runsCompany(user)) {
    nav.push({ to: "/company", label: t("nav.company"), icon: Building2Icon })
  }

  return (
    <AppShell nav={nav} context={<BranchSwitcher current={branch} />}>
      <Outlet context={{ branch } satisfies DashboardContext} />
    </AppShell>
  )
}

/** Hides a dashboard page from roles below `min` (the API refuses them too) */
export function RequireRole({ min }: { min: BranchRole }) {
  const context = useDashboard()
  if (!roleAtLeast(context.branch.role, min)) {
    return <Navigate to={`/dashboard/${context.branch.branch_id}`} replace />
  }
  return <Outlet context={context} />
}
