import { apiPage } from "@/lib/api/client"
import { api, apiMessage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { ManagedSport } from "@/types/sport"

const ALL = { query: { limit: 100 } }

export const sportService = {
  list: async (branchId: number) =>
    (await apiPage<ManagedSport>(API_ENDPOINTS.BRANCH.SPORTS(branchId), ALL))
      .items,
  saveSport: (
    branchId: number,
    s: { id?: number } & Omit<
      ManagedSport,
      "id" | "slug" | "image_url" | "plan_width" | "plan_height" | "floor"
    > &
      Partial<Pick<ManagedSport, "plan_width" | "plan_height" | "floor">>,
  ) =>
    s.id
      ? api<ManagedSport>(API_ENDPOINTS.BRANCH.SPORT(branchId, s.id), {
          method: "PUT",
          body: s,
        })
      : api<ManagedSport>(API_ENDPOINTS.BRANCH.SPORTS(branchId), {
          method: "POST",
          body: s,
        }),
  deleteSport: (branchId: number, id: number) =>
    apiMessage(API_ENDPOINTS.BRANCH.SPORT(branchId, id), { method: "DELETE" }),
}
