import { useOutletContext } from "react-router"

import type { MyBranch } from "@/types/auth"

export interface DashboardContext {
  branch: MyBranch
}

/** The branch in the URL and the caller's role there, for pages inside the dashboard */
export function useDashboard() {
  return useOutletContext<DashboardContext>()
}
