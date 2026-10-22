import { useQuery } from "@tanstack/react-query"

import { api, apiPage } from "@/lib/api/client"
import type { DirectoryBranch, PublicCompany } from "@/lib/api/types"

// a company has a handful of branches: one page holds them all (the API allows 100)
const ALL = 100

// the brand and the branch list change rarely: keep them a few minutes
const CATALOG = { staleTime: 5 * 60_000 }

/** The company's brand for the home page */
export function usePublicCompany() {
  return useQuery({
    queryKey: ["public", "company"],
    queryFn: () => api<PublicCompany>("/public/company"),
    ...CATALOG,
  })
}

/** Every live branch, newest first; the home filters them on the device */
export function useLiveBranches() {
  return useQuery({
    queryKey: ["public", "branches"],
    queryFn: async () =>
      (
        await apiPage<DirectoryBranch>("/public/branches", {
          query: { limit: ALL },
        })
      ).items,
    ...CATALOG,
  })
}
