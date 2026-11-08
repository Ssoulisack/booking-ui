import { useQuery } from "@tanstack/react-query"

import { useBiz, useChange, useDelete } from "@/hooks/use-branch"
import { sportService } from "@/services/sport.api"

export function useSportsList() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("sports"),
    queryFn: () => sportService.list(branchId),
  })
}

export const useSaveSport = (refresh = ["sports"]) =>
  useChange(sportService.saveSport, refresh)

export const useDeleteSport = (onDone: () => void) =>
  useDelete(sportService.deleteSport, onDone)
