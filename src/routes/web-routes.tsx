import type { RouteObject } from "react-router"

import { LegalPage } from "@/pages/public/legal"

import { RequireUser, ToBackoffice } from "./guards"
import { accountLayout, authRoutes, profileRoute, pub } from "./shared"

/**
 * The customer website: brand home, branch pages, booking, the customer's own account.
 * The company area, branch dashboards and invitations live in the backoffice and are sent there.
 */
export const webRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => ({
      Component: (await import("@/components/public/home/Home")).Home,
    }),
  },
  {
    // the brand home with its list of branches
    path: "home",
    lazy: async () => ({
      Component: (await import("@/components/public/home/BrandHome")).BrandHome,
    }),
  },
  {
    path: "privacy",
    lazy: async () => ({ Component: () => <LegalPage page="privacy" /> }),
  },
  {
    path: "data-deletion",
    lazy: async () => ({ Component: () => <LegalPage page="deletion" /> }),
  },
  authRoutes({ register: true }),

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
        lazy: accountLayout,
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
          profileRoute,
        ],
      },
    ],
  },

  // backoffice pages (old bookmarks and the invitation emails): to the backoffice subdomain
  { path: "company/*", element: <ToBackoffice /> },
  { path: "dashboard/*", element: <ToBackoffice /> },
  { path: "invite/:token", element: <ToBackoffice /> },
]
