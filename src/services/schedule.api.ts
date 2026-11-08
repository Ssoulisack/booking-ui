import { apiPage, ApiError } from "@/lib/api/client"
import type { EffectiveRule } from "@/types/public"
import { api, apiMessage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  Closure,
  HoursOwner,
  OpeningHour,
  Price,
  Rule,
  RuleFields,
  RuleScope,
  ScheduleOwner,
} from "@/types/schedule"

const ALL = { query: { limit: 100 } }

export const scheduleService = {
  hours: (branchId: number, owner: HoursOwner, id: number) =>
    api<OpeningHour[]>(API_ENDPOINTS.BRANCH.OPENING_HOURS(branchId, owner, id)),
  /** The owner's price, or null when none is set yet */
  price: async (branchId: number, owner: ScheduleOwner, id: number) => {
    try {
      return await api<Price>(API_ENDPOINTS.BRANCH.PRICES(branchId, owner, id))
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  },
  closures: async (branchId: number) =>
    (await apiPage<Closure>(API_ENDPOINTS.BRANCH.CLOSURES(branchId), ALL))
      .items,
  rules: (branchId: number) =>
    api<Rule[]>(API_ENDPOINTS.BRANCH.RULES(branchId)),
  /** The company rule this branch starts from */
  companyRule: (branchId: number) =>
    api<Rule>(API_ENDPOINTS.BRANCH.RULES_COMPANY(branchId)),
  /** The rule in force for a sport or a court (default <- sport <- court) */
  effectiveRule: (
    branchId: number,
    query: { sport_id?: number; resource_id?: number },
  ) =>
    api<EffectiveRule>(API_ENDPOINTS.BRANCH.RULES_EFFECTIVE(branchId), {
      query,
    }),
  saveHours: (
    branchId: number,
    p: { owner: HoursOwner; id: number; hours: OpeningHour[] },
  ) =>
    api<OpeningHour[]>(
      API_ENDPOINTS.BRANCH.OPENING_HOURS(branchId, p.owner, p.id),
      {
        method: "PUT",
        body: { hours: p.hours },
      },
    ),
  savePrice: (
    branchId: number,
    p: {
      owner: ScheduleOwner
      id: number
      price_per_hour: number
      currency: string
    },
  ) =>
    api<Price>(API_ENDPOINTS.BRANCH.PRICES(branchId, p.owner, p.id), {
      method: "PUT",
      body: { price_per_hour: p.price_per_hour, currency: p.currency },
    }),

  saveClosure: (branchId: number, c: { id?: number } & Omit<Closure, "id">) =>
    c.id
      ? api<Closure>(API_ENDPOINTS.BRANCH.CLOSURE(branchId, c.id), {
          method: "PUT",
          body: c,
        })
      : api<Closure>(API_ENDPOINTS.BRANCH.CLOSURES(branchId), {
          method: "POST",
          body: c,
        }),
  deleteClosure: (branchId: number, id: number) =>
    apiMessage(API_ENDPOINTS.BRANCH.CLOSURE(branchId, id), {
      method: "DELETE",
    }),

  saveRule: (
    branchId: number,
    r: { scope: RuleScope; id: number; fields: RuleFields },
  ) =>
    api<Rule>(API_ENDPOINTS.BRANCH.RULE(branchId, r.scope, r.id), {
      method: "PUT",
      body: r.fields,
    }),
  deleteRule: (branchId: number, r: { scope: RuleScope; id: number }) =>
    apiMessage(API_ENDPOINTS.BRANCH.RULE(branchId, r.scope, r.id), {
      method: "DELETE",
    }),
}
