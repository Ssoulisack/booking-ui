import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, apiMessage } from "@/lib/api/client"
import type { Media, MediaItem } from "@/lib/api/types"

/** `base` is "/company" or "/branches/{id}": the library of that scope only, never another's */
const mediaKey = (base: string) => ["media", base] as const

export function useMedia(base: string) {
  return useQuery({
    queryKey: mediaKey(base),
    queryFn: () => api<MediaItem[]>(`${base}/uploads`),
  })
}

export function useUploadMedia(base: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return api<Media>(`${base}/uploads`, {
        method: "POST",
        form,
        query: { folder: "branding" },
      })
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: mediaKey(base) }),
  })
}

export function useDeleteMedia(base: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (key: string) =>
      apiMessage(`${base}/uploads`, { method: "DELETE", query: { key } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: mediaKey(base) }),
  })
}

export const refreshMedia = (
  queryClient: ReturnType<typeof useQueryClient>,
  base: string,
) => queryClient.invalidateQueries({ queryKey: mediaKey(base) })
