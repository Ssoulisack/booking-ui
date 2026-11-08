import { api, apiMessage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { Media, MediaItem } from "@/types/media"

// `scope` is API_ENDPOINTS.COMPANY.BASE or API_ENDPOINTS.BRANCH.ROOT(id): the library of that scope only

export const mediaService = {
  list: (scope: string) => api<MediaItem[]>(API_ENDPOINTS.MEDIA.UPLOADS(scope)),
  upload: (scope: string, folder: string, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return api<Media>(API_ENDPOINTS.MEDIA.UPLOADS(scope), {
      method: "POST",
      form,
      query: { folder },
    })
  },
  remove: (scope: string, key: string) =>
    apiMessage(API_ENDPOINTS.MEDIA.UPLOADS(scope), {
      method: "DELETE",
      query: { key },
    }),
}
