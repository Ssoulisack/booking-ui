import type { MyBranch, User } from "@/lib/api/types"

import { usableBranches } from "./api"

/** Only same-site paths are followed after login, never another website */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || /^\/[/\\]/.test(next)) return null
  if (/^\/(login|register|forgot-password|reset-password)\b/.test(next))
    return null
  return next
}

/**
 * Where a user lands after login: the owner and admins → the company area, people who work at a
 * branch → its dashboard, everyone else (customers, staff switched off) → the public home
 */
export function homePath(user: User, branches: MyBranch[] | undefined): string {
  if (user.company_role === "owner" || user.company_role === "admin") {
    return "/company"
  }
  if (usableBranches(branches).length > 0) return "/dashboard"
  return "/"
}
