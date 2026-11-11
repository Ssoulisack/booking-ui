import {
  BarChart3Icon,
  Building2Icon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  HandCoinsIcon,
  ImagesIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  QrCodeIcon,
  SendIcon,
  SettingsIcon,
  TicketIcon,
  UsersIcon,
  UsersRoundIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"

import { PAGE_MIN_ROLE } from "@/lib/constants/roles"
import type { BranchRole } from "@/types/auth"

// The menus. Add a page here (and in breadcrumb.ts) to get it in the sidebar and the trail.

export interface NavSpec {
  /** the path after the area's base ("" is the overview) */
  path: string
  /** the label is t(`nav.${key}`) */
  key: string
  icon: LucideIcon
  /** match this path exactly (the overview) */
  end?: boolean
}

export interface DashboardNavSpec extends NavSpec {
  min: BranchRole
  /** courts only: a restaurant has no money to count or court use to report */
  sportOnly?: boolean
}

export const DASHBOARD_NAV: DashboardNavSpec[] = [
  {
    path: "",
    key: "overview",
    icon: LayoutDashboardIcon,
    min: PAGE_MIN_ROLE.overview,
    end: true,
  },
  {
    path: "calendar",
    key: "calendar",
    icon: CalendarDaysIcon,
    min: PAGE_MIN_ROLE.calendar,
  },
  {
    path: "bookings",
    key: "bookings",
    icon: ClipboardListIcon,
    min: PAGE_MIN_ROLE.bookings,
  },
  {
    path: "customers",
    key: "customers",
    icon: UsersRoundIcon,
    min: PAGE_MIN_ROLE.customers,
  },
  {
    path: "packages",
    key: "packages",
    icon: TicketIcon,
    min: PAGE_MIN_ROLE.packages,
    sportOnly: true,
  },
  {
    path: "cash-up",
    key: "cashUp",
    icon: HandCoinsIcon,
    min: PAGE_MIN_ROLE.cashUp,
    sportOnly: true,
  },
  {
    path: "employees",
    key: "employees",
    icon: UsersIcon,
    min: PAGE_MIN_ROLE.employees,
  },
  { path: "setup", key: "setup", icon: WrenchIcon, min: PAGE_MIN_ROLE.setup },
  {
    path: "reports",
    key: "reports",
    icon: BarChart3Icon,
    min: PAGE_MIN_ROLE.reports,
  },
  { path: "share", key: "share", icon: QrCodeIcon, min: PAGE_MIN_ROLE.share },
  { path: "media", key: "media", icon: ImagesIcon, min: PAGE_MIN_ROLE.media },
  {
    path: "telegram",
    key: "telegram",
    icon: SendIcon,
    min: PAGE_MIN_ROLE.telegram,
  },
  {
    path: "settings",
    key: "branchSettings",
    icon: SettingsIcon,
    min: PAGE_MIN_ROLE.branchSettings,
  },
]

export const COMPANY_NAV: NavSpec[] = [
  { path: "", key: "overview", icon: LayoutDashboardIcon, end: true },
  { path: "branches", key: "branches", icon: Building2Icon },
  { path: "team", key: "team", icon: UsersIcon },
  { path: "customers", key: "customers", icon: UsersRoundIcon },
  { path: "reports", key: "reports", icon: BarChart3Icon },
  { path: "users", key: "users", icon: KeyRoundIcon },
  { path: "rules", key: "bookingRules", icon: CalendarRangeIcon },
  { path: "share", key: "share", icon: QrCodeIcon },
  { path: "media", key: "media", icon: ImagesIcon },
  { path: "settings", key: "companySettings", icon: SettingsIcon },
]
