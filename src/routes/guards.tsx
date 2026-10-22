import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router"

import { useMe } from "@/features/auth/api"
import { PageLoader } from "@/components/page-state"
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
  // accounts made before nationality existed, or through an invitation, answer once
  if (
    me.data &&
    !me.data.nationality &&
    location.pathname !== "/account/profile"
  ) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/account/profile?complete=1&next=${next}`} replace />
  }
  return <Outlet />
}

/** Login and register pages: someone already logged in goes to their start page */
export function GuestOnly() {
  const token = useSession((s) => s.accessToken)
  if (token) return <Navigate to="/" replace />
  return <Outlet />
}

/** The company area: the owner and admins only */
export function RequireCompany() {
  const user = useSession((s) => s.user)
  if (!runsCompany(user)) return <Navigate to="/" replace />
  return <Outlet />
}

/** Clears the session as a side effect and shows the login page with the reason */
export function EndSession({ reason }: { reason: string }) {
  const signOut = useSession((s) => s.signOut)
  useEffect(() => signOut(reason), [signOut, reason])
  return <PageLoader />
}

/** /setup/courts/… → /setup/spaces/… (bookmarks from before the rename) */
export function OldCourtsLink() {
  const { pathname } = useLocation()
  return (
    <Navigate to={pathname.replace("/setup/courts", "/setup/spaces")} replace />
  )
}
