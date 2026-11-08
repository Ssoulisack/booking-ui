import type { BranchRole } from "@/types/auth"

// Same order as the backend (domain.MemberRank): a higher role can do everything a lower one can;
// the company owner and admins rank the same at every branch
const RANK: Record<BranchRole, number> = {
  staff: 1,
  manager: 2,
  admin: 3,
  owner: 3,
}

export function roleAtLeast(role: BranchRole, min: BranchRole): boolean {
  return RANK[role] >= RANK[min]
}

/**
 * The lowest role that may open each dashboard page (the API refuses the others too). The menu
 * and the router both read this, so a page is hidden and guarded by the same rule.
 */
export const PAGE_MIN_ROLE = {
  overview: "staff",
  calendar: "staff",
  bookings: "staff",
  customers: "staff",
  packages: "staff",
  cashUp: "staff",
  share: "staff",
  setup: "manager",
  reports: "manager",
  media: "manager",
  telegram: "admin",
  branchSettings: "admin",
} as const satisfies Record<string, BranchRole>
