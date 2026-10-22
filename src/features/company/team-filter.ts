import type { TeamMember } from "@/lib/api/types"

/**
 * What people type for an employee number ("ENO000007", "eno7", "ENO-7") in the stored form, the
 * same reading as the backend; null for anything else
 */
export function parseEmployeeNo(q: string): string | null {
  const m = /^ENO[\s-]*0*([1-9]\d{0,8})$/.exec(q.trim().toUpperCase())
  return m ? `ENO${m[1].padStart(6, "0")}` : null
}

export interface TeamFilter {
  /** name, email, phone or employee number (ENO000007) */
  q: string
  /** a branch id, or 0 for every branch */
  branch: number
  /** owner, admin, manager or staff; empty for every role */
  role?: TeamMember["role"] | ""
  /** dashboard access switched on or off; empty for both */
  access?: "on" | "off" | ""
}

const digits = (s: string) => s.replace(/\D/g, "")

/**
 * Whether a team member matches the search and the branch. An employee number (ENO000007) matches
 * that person exactly; other numbers match part of the phone, typed with or without the leading
 * 0 ("020 5555…" or "205555…"). The owner and admins work at every branch, so they match any branch.
 */
export function matchesMember(m: TeamMember, f: TeamFilter): boolean {
  if (f.role && m.role !== f.role) return false
  if (f.access && m.active !== (f.access === "on")) return false
  const atBranch =
    !f.branch ||
    m.role === "owner" ||
    m.role === "admin" ||
    m.branches.some((b) => b.id === f.branch)
  if (!atBranch) return false

  const q = f.q.trim().toLowerCase()
  if (!q) return true
  if (m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
    return true

  const no = parseEmployeeNo(q)
  if (no !== null) return m.member_no === no
  const n = digits(q)
  if (!n) return false
  const phone = digits(m.phone)
  const local = n.replace(/^0/, "")
  return phone !== "" && local !== "" && phone.includes(local)
}
