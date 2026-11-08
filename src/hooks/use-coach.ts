import { useQuery } from "@tanstack/react-query"

import { useBiz, useChange, useDelete } from "@/hooks/use-branch"
import { coachService } from "@/services/coach.api"

export function useCoachesList() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("coaches"),
    queryFn: () => coachService.list(branchId),
  })
}

export const useSaveCoach = (refresh = ["coaches"]) =>
  useChange(coachService.saveCoach, refresh)

export const useDeleteCoach = (onDone: () => void) =>
  useDelete(coachService.deleteCoach, onDone)
