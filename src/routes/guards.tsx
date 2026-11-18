import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, Outlet, useLocation, useSearchParams } from "react-router"

import { Button } from "@/components/ui/button"

import { usableBranches, useMe, useMyBranches } from "@/hooks/use-auth"
import { adminUrlOf, webUrlOf } from "@/lib/site"
import { PageLoader } from "@/components/global/page-state"
import { afterAuthPath } from "@/components/public/auth/landing"
import { runsCompany, useSession } from "@/stores/session"

function loginPath(location: { pathname: string; search: string }) {
  const next = location.pathname + location.search
  return `/login?next=${encodeURIComponent(next)}`
}

/** Logged-in users only; the account is re-checked with the server on entry */
export function RequireUser() {
  const token = useSession((s) => s.accessToken)
  const signedOut = useSession((s) => s.signedOut)
  const location = useLocation()
  const me = useMe()

  // after a logout (by hand or forced) the next login must not reopen the previous person's page
  if (!token) {
    return <Navigate to={signedOut ? "/login" : loginPath(location)} replace />
  }
  if (me.isPending) return <PageLoader />
  return <Outlet />
}

/**
 * Login and register pages: someone already logged in leaves them. They go to the page they came from (?next=) or the
 * branch they scanned, not to the list of all branches (logging in sets the token, which runs this before the page's own
 * redirect does).
 */
export function GuestOnly() {
  const token = useSession((s) => s.accessToken)
  const [params] = useSearchParams()
  if (token) return <Navigate to={afterAuthPath(params.get("next"))} replace />
  return <Outlet />
}

/** The company area: the owner and admins only */
export function RequireCompany() {
  const user = useSession((s) => s.user)
  if (!runsCompany(user)) return <Navigate to="/" replace />
  return <Outlet />
}

/** /setup/courts/… → /setup/spaces/… (bookmarks from before the rename) */
export function OldCourtsLink() {
  const { pathname } = useLocation()
  return (
    <Navigate to={pathname.replace("/setup/courts", "/setup/spaces")} replace />
  )
}

/** Leaves this site for the same page on the other one (a full page load: each site has its own login) */
function Leave({ to }: { to: string }) {
  useEffect(() => window.location.replace(to), [to])
  return <PageLoader />
}

/** A customer page opened in the backoffice: the same page on the website */
export function ToWebsite() {
  const { pathname, search, hash } = useLocation()
  return <Leave to={webUrlOf(pathname + search + hash)} />
}

/** A backoffice page (bookmark, invitation email) opened on the website: the same page in the backoffice */
export function ToBackoffice() {
  const { pathname, search, hash } = useLocation()
  return <Leave to={adminUrlOf(pathname + search + hash)} />
}

/**
 * "/" of the backoffice: login first; then the owner and admins → the company area, people who work at a branch → its
 * dashboard; anyone else is told this is the team's site and pointed to the website.
 */
export function BackofficeHome() {
  const token = useSession((s) => s.accessToken)
  const user = useSession((s) => s.user)
  const branches = useMyBranches()

  if (!token || !user) return <Navigate to="/login" replace />
  if (runsCompany(user)) return <Navigate to="/company" replace />
  if (branches.isPending) return <PageLoader />
  if (usableBranches(branches.data).length > 0) {
    return <Navigate to="/dashboard" replace />
  }
  return <NoBackoffice />
}

function NoBackoffice() {
  const { t } = useTranslation()
  const signOut = useSession((s) => s.signOut)
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">
        {t("backoffice.noAccessTitle")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("backoffice.noAccessBody")}
      </p>
      <Button asChild className="h-11">
        <a href={webUrlOf("/")}>{t("backoffice.toWebsite")}</a>
      </Button>
      <Button variant="outline" className="h-11" onClick={() => signOut()}>
        {t("backoffice.otherAccount")}
      </Button>
    </main>
  )
}
