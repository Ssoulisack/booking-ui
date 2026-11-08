import { useQuery } from "@tanstack/react-query"

import { useBiz, useChange, useDelete } from "@/hooks/use-branch"
import { classService } from "@/services/class.api"

/** Classes between two dates (YYYY-MM-DD, business time zone, both included) */
export function useClassList(from: string, to: string) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("classes", from, to),
    queryFn: () => classService.sessions(branchId, from, to),
  })
}

/** The branch's weekly class timetables */
export function useTimetables() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("timetables"),
    queryFn: () => classService.timetables(branchId),
  })
}

export const useSaveClass = (refresh = ["classes"]) =>
  useChange(classService.saveClass, refresh)

export const useDeleteClass = (onDone: () => void) =>
  useDelete(classService.deleteClass, onDone)

export const useSaveTimetable = (refresh = ["classes", "timetables"]) =>
  useChange(classService.saveTimetable, refresh)

export const useStopTimetable = (onDone: () => void) =>
  useDelete(classService.stopTimetable, onDone)
