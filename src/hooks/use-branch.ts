import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query"

import { useDashboard } from "@/components/provider/dashboard-context"
import { branchService } from "@/services/branch.api"
import type { SettingsInput } from "@/types/settings"

/** Id and cache keys of the branch in the URL */
export function useBiz() {
  const id = useDashboard().branch.branch_id
  const key = (...parts: unknown[]): QueryKey => ["manage", id, ...parts]
  return { id, key }
}

/**
 * A change to this branch. After it succeeds, the listed caches are refreshed (plus the public
 * pages, which most changes affect).
 */
export function useChange<I, O>(
  fn: (branchId: number, input: I) => Promise<O>,
  refresh: string[],
) {
  const { id: branchId, key } = useBiz()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: I) => fn(branchId, input),
    onSuccess: () => {
      for (const part of refresh) {
        void queryClient.invalidateQueries({ queryKey: key(part) })
      }
      void queryClient.invalidateQueries({ queryKey: ["public"] })
      void queryClient.invalidateQueries({ queryKey: ["me", "branches"] })
    },
  })
}

/** Mutation helper for one delete button: closes its dialog when done */
export function useDelete(
  fn: (branchId: number, id: number) => Promise<unknown>,
  onDone: () => void,
) {
  const { id: branchId } = useBiz()
  return useMutation({
    mutationFn: (id: number) => fn(branchId, id),
    onSuccess: onDone,
  })
}

export function useSettings() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("settings"),
    queryFn: () => branchService.getSettings(branchId),
    // the page remounts its form when this data changes: a refocus (e.g. after the file picker) must not wipe unsaved edits
    refetchOnWindowFocus: false,
  })
}

export const useSaveSettings = (refresh = ["settings"]) =>
  useChange<SettingsInput, unknown>(branchService.saveSettings, refresh)

/** Publish / unpublish the branch; the caller decides what to refresh */
export function useBranchActions() {
  const { id: branchId } = useBiz()
  return {
    publish: () => branchService.publish(branchId),
    unpublish: () => branchService.unpublish(branchId),
  }
}
