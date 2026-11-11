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

/** The ticked coaches that still teach the sport (a coach who stopped teaching it is dropped when saving) */
export function useSportCoachIds(sportId: number, ids: number[]) {
  const coaches = useCoachesList().data ?? []
  return ids.filter((id) =>
    coaches.some((c) => c.id === id && c.sports.some((s) => s.id === sportId)),
  )
}
