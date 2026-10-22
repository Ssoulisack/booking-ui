import type { BranchRole } from "@/lib/api/types"

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
