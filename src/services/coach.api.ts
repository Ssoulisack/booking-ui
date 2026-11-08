import { apiPage } from "@/lib/api/client"
import { api, apiMessage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { ManagedCoach } from "@/types/coach"

const ALL = { query: { limit: 100 } }

export const coachService = {
  list: async (branchId: number) =>
    (await apiPage<ManagedCoach>(API_ENDPOINTS.BRANCH.COACHES(branchId), ALL))
      .items,
  saveCoach: (
    branchId: number,
    c: { id?: number; sport_ids: number[] } & Omit<
      ManagedCoach,
      "id" | "sports" | "image_url"
    >,
  ) =>
    c.id
      ? api<ManagedCoach>(API_ENDPOINTS.BRANCH.COACH(branchId, c.id), {
          method: "PUT",
          body: c,
        })
      : api<ManagedCoach>(API_ENDPOINTS.BRANCH.COACHES(branchId), {
          method: "POST",
          body: c,
        }),
  deleteCoach: (branchId: number, id: number) =>
    apiMessage(API_ENDPOINTS.BRANCH.COACH(branchId, id), { method: "DELETE" }),
}
