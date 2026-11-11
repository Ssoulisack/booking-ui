import type { MyBranch, User } from "@/types/auth"

import { readOriginSlug } from "@/components/public/booking/origin"
import { usableBranches } from "@/hooks/use-auth"

/** Only same-site paths are followed after login, never another website */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || /^\/[/\\]/.test(next)) return null
  if (/^\/(login|register|forgot-password|reset-password)\b/.test(next))
    return null
  return next
}

/**
 * Where someone goes right after logging in or registering: the page they asked for (?next=), else the branch they
 * came from (a customer who scanned a branch's QR goes back to that branch), else the list of all branches.
 */
export function afterAuthPath(next: string | null | undefined): string {
  const asked = safeNext(next)
  if (asked) return asked
  const slug = readOriginSlug()
  return slug ? `/b/${encodeURIComponent(slug)}` : "/"
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
