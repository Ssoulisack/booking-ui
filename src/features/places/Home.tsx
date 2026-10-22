import { Navigate } from "react-router"

import { PageLoader } from "@/components/page-state"
import { usableBranches, useMyBranches } from "@/features/auth/api"
import { runsCompany, useSession } from "@/stores/session"

import { BrandHome } from "./BrandHome"

/**
 * "/" — the company's brand home, for guests and customers. Team members go to their own
 * area; an account without a nationality answers that question first.
 */
export function Home() {
  const user = useSession((s) => s.user)
  const token = useSession((s) => s.accessToken)
  const branches = useMyBranches()

  if (!token || !user) return <BrandHome />
  if (runsCompany(user)) return <Navigate to="/company" replace />
  if (branches.isPending) return <PageLoader />
  if (usableBranches(branches.data).length > 0) {
    return <Navigate to="/dashboard" replace />
  }
  if (!user.nationality) {
    return <Navigate to="/account/profile?complete=1&next=%2F" replace />
  }
  return <BrandHome />
}
