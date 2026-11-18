import type { RouteObject } from "react-router"

import { GuestOnly } from "./guards"

// Each area is its own download, so a customer opening /b/{slug} on a phone never loads the
// dashboard or company code.
export const auth = () => import("@/pages/auth")
export const company = () => import("@/pages/company")
export const dashboard = () => import("@/pages/dashboard")
export const pub = () => import("@/pages/public")

type DashboardPage = keyof Awaited<ReturnType<typeof dashboard>>
type CompanyPage = keyof Awaited<ReturnType<typeof company>>

/** A company route whose screen loads with the company code */
export const companyPage = (path: string, name: CompanyPage): RouteObject => ({
  path,
  lazy: async () => ({
    Component: (await company())[name] as React.ComponentType,
  }),
})

/** A dashboard route whose screen loads with the dashboard code */
export const page = (path: string, name: DashboardPage): RouteObject => ({
  path,
  lazy: async () => ({
    Component: (await dashboard())[name] as React.ComponentType,
  }),
})

/**
 * Login, password reset (and, on the website, register). `extra` adds more pages to the same layout,
 * e.g. the invitation page in the backoffice.
 */
export function authRoutes({
  register,
  extra = [],
}: {
  register: boolean
  extra?: RouteObject[]
}): RouteObject {
  const guestPages: RouteObject[] = [
    {
      path: "login",
      lazy: async () => ({ Component: (await auth()).LoginPage }),
    },
    {
      path: "forgot-password",
      lazy: async () => ({ Component: (await auth()).ForgotPasswordPage }),
    },
  ]
  if (register) {
    guestPages.push({
      path: "register",
      lazy: async () => ({ Component: (await auth()).RegisterPage }),
    })
  }
  return {
    lazy: async () => ({
      Component: (await import("@/components/layout/AuthLayout")).AuthLayout,
    }),
    children: [
      { element: <GuestOnly />, children: guestPages },
      {
        path: "reset-password/:token",
        lazy: async () => ({ Component: (await auth()).ResetPasswordPage }),
      },
      ...extra,
    ],
  }
}

/** /account/profile: name, phone, email and password (both sites: the team needs it too) */
export const profileRoute: RouteObject = {
  path: "profile",
  lazy: async () => ({
    Component: (await import("@/components/protected/account/ProfilePage"))
      .ProfilePage,
  }),
}

/** The account shell around /account pages */
export const accountLayout = async () => ({
  Component: (await import("@/components/layout/AccountShell")).AccountLayout,
})
