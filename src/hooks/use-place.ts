import { useQuery } from "@tanstack/react-query"

import { placeService } from "@/services/place.api"

// the brand and the branch list change rarely: keep them a few minutes
const CATALOG = { staleTime: 5 * 60_000 }

export function usePublicCompany() {
  return useQuery({
    queryKey: ["public", "company"],
    queryFn: placeService.company,
    ...CATALOG,
  })
}

/** Every live branch, newest first; the home filters them on the device */
export function useLiveBranches() {
  return useQuery({
    queryKey: ["public", "branches"],
    queryFn: placeService.liveBranches,
    ...CATALOG,
  })
}
