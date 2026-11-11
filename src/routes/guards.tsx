import { Navigate, Outlet, useLocation, useSearchParams } from "react-router"

import { useMe } from "@/hooks/use-auth"
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
