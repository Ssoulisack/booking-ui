import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { mediaService } from "@/services/media.api"
import type { Media } from "@/types/media"

const mediaKey = (scope: string) => ["media", scope] as const

export function useMedia(scope: string) {
  return useQuery({
    queryKey: mediaKey(scope),
    queryFn: () => mediaService.list(scope),
  })
}

/** A new file shows in the Media page and the picker at once */
export function useUploadMedia(
  scope: string,
  folder = "branding",
  options?: { onSuccess?: (media: Media) => void },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => mediaService.upload(scope, folder, file),
    onSuccess: (media) => {
      void queryClient.invalidateQueries({ queryKey: mediaKey(scope) })
      options?.onSuccess?.(media)
    },
  })
}

export function useDeleteMedia(scope: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => mediaService.remove(scope, key),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: mediaKey(scope) }),
  })
}
