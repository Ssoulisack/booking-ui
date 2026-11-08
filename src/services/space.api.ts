import { apiPage } from "@/lib/api/client"
import { api, apiMessage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { FloorItem, FloorPlan } from "@/types/floor-plan"
import type {
  ManagedResource,
  ManagedTable,
  TableSettings,
} from "@/types/space"

const ALL = { query: { limit: 100 } }

export const spaceService = {
  resources: async (branchId: number) =>
    (
      await apiPage<ManagedResource>(
        API_ENDPOINTS.BRANCH.RESOURCES(branchId),
        ALL,
      )
    ).items,
  plan: (branchId: number, areaId: number) =>
    api<FloorPlan>(API_ENDPOINTS.BRANCH.SPORT_PLAN(branchId, areaId)),
  tableSettings: (branchId: number) =>
    api<TableSettings>(API_ENDPOINTS.BRANCH.TABLE_SETTINGS(branchId)),
  saveResource: (
    branchId: number,
    r: { id?: number } & Omit<ManagedResource, "id">,
  ) =>
    r.id
      ? api<ManagedResource>(API_ENDPOINTS.BRANCH.RESOURCE(branchId, r.id), {
          method: "PUT",
          body: r,
        })
      : api<ManagedResource>(API_ENDPOINTS.BRANCH.RESOURCES(branchId), {
          method: "POST",
          body: r,
        }),
  deleteResource: (branchId: number, id: number) =>
    apiMessage(API_ENDPOINTS.BRANCH.RESOURCE(branchId, id), {
      method: "DELETE",
    }),

  /** Saves an area's plan size and where every table stands, at once */
  saveFloorPlan: (
    branchId: number,
    p: {
      areaId: number
      plan_width: number
      plan_height: number
      tables: Array<
        Pick<
          ManagedTable,
          | "id"
          | "plan_x"
          | "plan_y"
          | "plan_w"
          | "plan_h"
          | "rotation"
          | "shape"
        >
      >
      items: FloorItem[]
      /** copies of tables, made together with this save */
      new_tables?: Array<
        Pick<
          ManagedTable,
          | "name"
          | "seats"
          | "extra_chairs"
          | "active"
          | "shape"
          | "plan_x"
          | "plan_y"
          | "plan_w"
          | "plan_h"
          | "rotation"
        >
      >
    },
  ) =>
    api<FloorPlan>(API_ENDPOINTS.BRANCH.SPORT_PLAN(branchId, p.areaId), {
      method: "PUT",
      body: {
        plan_width: p.plan_width,
        plan_height: p.plan_height,
        tables: p.tables,
        new_tables: p.new_tables ?? [],
        // the whole list replaces the area's objects (new ones have no id yet)
        items: p.items.map((i) => ({ ...i, id: i.id > 0 ? i.id : 0 })),
      },
    }),
  saveTableSettings: (branchId: number, body: TableSettings) =>
    api<TableSettings>(API_ENDPOINTS.BRANCH.TABLE_SETTINGS(branchId), {
      method: "PUT",
      body,
    }),
}
