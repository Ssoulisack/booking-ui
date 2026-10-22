import { useOutletContext } from "react-router"

import type { MyBranch } from "@/lib/api/types"

export interface DashboardContext {
  branch: MyBranch
}

/** The branch in the URL and the caller's role there, for pages inside the dashboard */
export function useDashboard() {
  return useOutletContext<DashboardContext>()
}
