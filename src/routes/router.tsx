import { createBrowserRouter, Outlet, ScrollRestoration } from "react-router"

import {
  CrashScreen,
  NotFound,
  PageLoader,
} from "@/components/global/page-state"
import { LegalPage } from "@/pages/public/legal"
import { TrackPage } from "@/components/public/booking/TrackPage"

import { GuestOnly, OldCourtsLink, RequireCompany, RequireUser } from "./guards"

// Each area is its own download, so a customer opening /b/{slug} on a phone never loads the
// dashboard or company code.
const auth = () => import("@/pages/auth")
const company = () => import("@/pages/company")
const dashboard = () => import("@/pages/dashboard")
const pub = () => import("@/pages/public")

type DashboardPage = keyof Awaited<ReturnType<typeof dashboard>>
type CompanyPage = keyof Awaited<ReturnType<typeof company>>
/** A company route whose screen loads with the company code */
const companyPage = (path: string, name: CompanyPage) => ({
  path,
  lazy: async () => ({
    Component: (await company())[name] as React.ComponentType,
  }),
})
/** A dashboard route whose screen loads with the dashboard code */
const page = (path: string, name: DashboardPage) => ({
  path,
  lazy: async () => ({
    Component: (await dashboard())[name] as React.ComponentType,
  }),
})

// Paths used in emails by the backend: /reset-password/{token}, /invite/{token},
// /b/{slug} and /b/{slug}/booking/{token}
export const router = createBrowserRouter([
  {
    HydrateFallback: PageLoader,
    ErrorBoundary: CrashScreen,
    // a new page opens at the top; Back returns to where you were
    element: (
      <>
        <TrackPage />
        <Outlet />
        <ScrollRestoration />
      </>
    ),
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import("@/components/public/home/Home")).Home,
        }),
      },
      {
        path: "privacy",
        lazy: async () => ({
          Component: () => <LegalPage page="privacy" />,
        }),
      },
      {
        path: "data-deletion",
        lazy: async () => ({
          Component: () => <LegalPage page="deletion" />,
        }),
      },
      {
        lazy: async () => ({
          Component: (await import("@/components/layout/AuthLayout"))
            .AuthLayout,
        }),
        children: [
          {
            element: <GuestOnly />,
            children: [
              {
                path: "login",
                lazy: async () => ({ Component: (await auth()).LoginPage }),
              },
              {
                path: "register",
                lazy: async () => ({ Component: (await auth()).RegisterPage }),
              },
              {
                path: "forgot-password",
                lazy: async () => ({
                  Component: (await auth()).ForgotPasswordPage,
                }),
              },
            ],
          },
          {
            path: "reset-password/:token",
            lazy: async () => ({ Component: (await auth()).ResetPasswordPage }),
          },
          {
            path: "invite/:token",
            lazy: async () => ({ Component: (await auth()).AcceptInvitePage }),
          },
        ],
      },

      // public booking pages: no login needed
      {
        path: "b/:slug",
        lazy: async () => ({ Component: (await pub()).PublicLayout }),
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await pub()).PublicHome }),
          },
          {
            path: "book",
            lazy: async () => ({ Component: (await pub()).CheckoutPage }),
          },
          {
            path: "package/:id",
            lazy: async () => ({ Component: (await pub()).PackagePayPage }),
          },
          {
            path: "events/:eventId",
            lazy: async () => ({ Component: (await pub()).EventPage }),
          },
          {
            path: "confirmed",
            lazy: async () => ({ Component: (await pub()).ConfirmedPage }),
          },
          {
            path: "booking/:token",
            lazy: async () => ({ Component: (await pub()).GuestBookingPage }),
          },
          {
            path: "find",
            lazy: async () => ({ Component: (await pub()).FindBookingPage }),
          },
        ],
      },

      {
        element: <RequireUser />,
        children: [
          {
            path: "account",
            lazy: async () => ({
              Component: (await import("@/components/layout/AccountShell"))
                .AccountLayout,
            }),
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (
                    await import("@/components/protected/account/AccountPage")
                  ).AccountPage,
                }),
              },
              {
                path: "bookings/:id",
                lazy: async () => ({
                  Component: (
                    await import("@/components/protected/account/AccountBookingPage")
                  ).AccountBookingPage,
                }),
              },
              {
                path: "packages",
                lazy: async () => ({
                  Component: (
                    await import("@/components/protected/account/MyPackagesPage")
                  ).MyPackagesPage,
                }),
              },
              {
                path: "profile",
                lazy: async () => ({
                  Component: (
                    await import("@/components/protected/account/ProfilePage")
                  ).ProfilePage,
                }),
              },
            ],
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
              page("calendar", "CalendarPage"),
              page("bookings", "BookingsPage"),
              page("customers", "CustomersPage"),
              page("packages", "SoldPackagesPage"),
              page("share", "SharePage"),
              page("cash-up", "CashUpPage"),
              {
                lazy: async () => {
                  const { RequireRole } = await dashboard()
                  return { element: <RequireRole min="manager" /> }
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
                  return { element: <RequireRole min="admin" /> }
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

      { path: "*", element: <NotFound /> },
    ],
  },
])
