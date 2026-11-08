import { api, apiPage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { DirectoryBranch } from "@/types/place"
import type { PublicCompany } from "@/types/public"

// a company has a handful of branches: one page holds them all (the API allows 100)
const ALL = 100

export const placeService = {
  /** The company's brand for the home page */
  company: () => api<PublicCompany>(API_ENDPOINTS.PUBLIC_HOME.COMPANY),
  /** Every live branch, newest first */
  liveBranches: async () =>
    (
      await apiPage<DirectoryBranch>(API_ENDPOINTS.PUBLIC_HOME.BRANCHES, {
        query: { limit: ALL },
      })
    ).items,
}
