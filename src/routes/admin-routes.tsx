import type { RouteObject } from "react-router"

import { NotFound } from "@/components/global/page-state"
import { PAGE_MIN_ROLE } from "@/lib/constants/roles"

import {
  BackofficeHome,
  OldCourtsLink,
  RequireCompany,
  RequireUser,
  ToWebsite,
} from "./guards"
import {
  auth,
  authRoutes,
  company,
  companyPage,
  dashboard,
  page,
  profileRoute,
} from "./shared"

/**
 * The backoffice (admin.<domain>, dev :5175): company area, branch dashboards, login for the team.
 * Customer pages (/b/…, /account bookings, legal pages) live on the website and are sent there.
 */
export const adminRoutes: RouteObject[] = [
  { index: true, element: <BackofficeHome /> },
  authRoutes({
    register: false,
    extra: [
      {
        path: "invite/:token",
        lazy: async () => ({ Component: (await auth()).AcceptInvitePage }),
      },
    ],
  }),
  {
    element: <RequireUser />,
    children: [
      {
        path: "account",
        lazy: async () => ({
          Component: (
            await import("@/components/layout/BackofficeProfileLayout")
          ).BackofficeProfileLayout,
        }),
        children: [{ index: true, element: <ToWebsite /> }, profileRoute],
      },
      {
        path: "company",
        element: <RequireCompany />,
        children: [
          {
            lazy: async () => ({
              Component: (await company()).CompanyLayout,
            }),
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await company()).CompanyHome,
                }),
              },
              companyPage("branches", "BranchesPage"),
              companyPage("team", "TeamPage"),
              companyPage("team/invite", "InvitePage"),
              companyPage("customers", "CustomersPage"),
              companyPage("reports", "ReportsPage"),
              companyPage("users", "UsersPage"),
              companyPage("rules", "CompanyRulesPage"),
              companyPage("media", "CompanyMediaPage"),
              companyPage("share", "CompanySharePage"),
              companyPage("settings", "CompanySettingsPage"),
              { path: "*", element: <NotFound /> },
            ],
          },
        ],
      },
      {
        path: "dashboard",
        lazy: async () => ({
          Component: (await dashboard()).DashboardIndex,
        }),
      },
      {
        path: "dashboard/:branchId",
        lazy: async () => ({
          Component: (await dashboard()).DashboardLayout,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await dashboard()).DashboardHome,
            }),
          },
          // a new sport branch set up step by step (the layout sends it here until done)
          page("start", "SetupWizard"),
          page("calendar", "CalendarPage"),
          page("bookings", "BookingsPage"),
          page("customers", "CustomersPage"),
          page("packages", "SoldPackagesPage"),
          page("share", "SharePage"),
          page("cash-up", "CashUpPage"),
          {
            lazy: async () => {
              const { RequireRole } = await dashboard()
              return { element: <RequireRole min={PAGE_MIN_ROLE.setup} /> }
            },
            children: [
              {
                path: "setup",
                lazy: async () => ({
                  Component: (await dashboard()).SetupLayout,
                }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await dashboard()).SetupIndex,
                    }),
                  },
                  page("sports", "SportsPage"),
                  page("spaces", "CourtsPage"),
                  page("spaces/:resourceId", "CourtDetailPage"),
                  // the old address (before courts were called spaces)
                  { path: "courts/*", element: <OldCourtsLink /> },
                  page("coaches", "CoachesPage"),
                  page("coaches/:coachId", "CoachDetailPage"),
                  page("classes", "ClassesPage"),
                  page("packages", "PackagesPage"),
                  page("payments", "PaymentsPage"),
                  page("closures", "ClosuresPage"),
                  page("rules", "RulesPage"),
                  // restaurant branches
                  page("floor-plan", "FloorPlanPage"),
                  page("hours", "VenueHoursPage"),
                  page("table-settings", "TableSettingsPage"),
                  page("events", "EventsPage"),
                ],
              },
              page("media", "MediaPage"),
              page("employees", "EmployeesPage"),
              {
                path: "reports",
                // its own download: the chart library is only needed here
                lazy: async () => ({
                  Component: (
                    await import("@/components/protected/desk/ReportsPage")
                  ).ReportsPage,
                }),
              },
            ],
          },
          {
            lazy: async () => {
              const { RequireRole } = await dashboard()
              return {
                element: <RequireRole min={PAGE_MIN_ROLE.branchSettings} />,
              }
            },
            children: [
              page("settings", "SettingsPage"),
              page("telegram", "TelegramPage"),
            ],
          },
        ],
      },
    ],
  },
  // customer pages: on the website
  { path: "b/*", element: <ToWebsite /> },
  { path: "home", element: <ToWebsite /> },
  { path: "register", element: <ToWebsite /> },
  { path: "privacy", element: <ToWebsite /> },
  { path: "data-deletion", element: <ToWebsite /> },
  { path: "account/*", element: <ToWebsite /> },
]
