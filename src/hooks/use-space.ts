import { useQueries, useQuery } from "@tanstack/react-query"

import { useBiz, useChange, useDelete } from "@/hooks/use-branch"
import { spaceService } from "@/services/space.api"

export function useResourcesList() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("resources"),
    queryFn: () => spaceService.resources(branchId),
  })
}

/** A restaurant area with its tables, for the floor plan editor */
export function useFloorPlan(areaId: number) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("plan", areaId),
    queryFn: () => spaceService.plan(branchId, areaId),
    enabled: areaId > 0,
    // the editor keeps unsaved moves in its own state: a refocus must not reset them
    refetchOnWindowFocus: false,
  })
}

/** Every area's plan of a restaurant at once (the Overview's floor plan) */
export function useAllFloorPlans(areaIds: number[]) {
  const { id: branchId, key } = useBiz()
  return useQueries({
    queries: areaIds.map((id) => ({
      queryKey: key("plan", id),
      queryFn: () => spaceService.plan(branchId, id),
    })),
  })
}

export function useTableSettings() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("table-settings"),
    queryFn: () => spaceService.tableSettings(branchId),
    refetchOnWindowFocus: false,
  })
}

export const useSaveResource = (refresh = ["resources"]) =>
  useChange(spaceService.saveResource, refresh)

export const useDeleteResource = (onDone: () => void) =>
  useDelete(spaceService.deleteResource, onDone)

export const useSaveTableSettings = (refresh = ["table-settings"]) =>
  useChange(spaceService.saveTableSettings, refresh)

/**
 * Calls a screen strings together itself (it saves many tables in one go and refreshes once):
 * the service calls with this branch's id already in them, and no cache refresh.
 */
export function useSpaceActions() {
  const { id: branchId } = useBiz()
  return {
    saveResource: (
      ...a: Parameters<typeof spaceService.saveResource> extends [
        number,
        ...infer R,
      ]
        ? R
        : never
    ) => spaceService.saveResource(branchId, ...a),
    saveFloorPlan: (
      ...a: Parameters<typeof spaceService.saveFloorPlan> extends [
        number,
        ...infer R,
      ]
        ? R
        : never
    ) => spaceService.saveFloorPlan(branchId, ...a),
  }
}
