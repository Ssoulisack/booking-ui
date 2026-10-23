import { useEffect } from "react"
import { useLocation } from "react-router"

import { trackPage } from "./origin"

/** Remembers the last home or branch page, so My bookings and My account can lead back to it */
export function TrackPage() {
  const { pathname } = useLocation()
  useEffect(() => trackPage(pathname), [pathname])
  return null
}
