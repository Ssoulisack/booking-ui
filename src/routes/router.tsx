import { ChangePasswordPrompt } from "@/components/global/ChangePasswordPrompt"
import { VerifyEmailReminder } from "@/components/global/VerifyEmailReminder"
import { createBrowserRouter, Outlet, ScrollRestoration } from "react-router"

import {
  CrashScreen,
  NotFound,
  PageLoader,
} from "@/components/global/page-state"
import { TrackPage } from "@/components/public/booking/TrackPage"
import { IS_ADMIN } from "@/lib/site"

import { adminRoutes } from "./admin-routes"
import { webRoutes } from "./web-routes"

// Two sites from one code base (see lib/site.ts): the customer website and the backoffice.
// Paths used in emails by the backend: /reset-password/{token}, /invite/{token} (website → backoffice),
// /b/{slug} and /b/{slug}/booking/{token}
export const router = createBrowserRouter([
  {
    HydrateFallback: PageLoader,
    ErrorBoundary: CrashScreen,
    // a new page opens at the top; Back returns to where you were
    element: (
      <>
        {!IS_ADMIN && <TrackPage />}
        <Outlet />
        {/* a password the team set: the person is asked to choose their own (and add an email) */}
        <ChangePasswordPrompt />
        <VerifyEmailReminder />
        <ScrollRestoration />
      </>
    ),
    children: [
      // written out (not IS_ADMIN) so the build drops the other site's pages
      ...(import.meta.env.MODE === "admin" ? adminRoutes : webRoutes),
      { path: "*", element: <NotFound /> },
    ],
  },
])
