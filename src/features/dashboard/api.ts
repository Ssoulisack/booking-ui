import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query"

import { api, apiMessage, apiPage, ApiError } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  ClassSession,
  Timetable,
  TimetableInput,
  TimetableResult,
  TimetableStop,
} from "@/types/class"
import type { ManagedCoach } from "@/types/coach"
import type {
  EventInput,
  EventItem,
  EventPrices,
  EventPricesInput,
} from "@/types/event"
import type { FloorItem, FloorPlan } from "@/types/floor-plan"
import type { Media } from "@/types/media"
import type { PayInfo, PaymentSettings } from "@/types/payment"
import type { EffectiveRule } from "@/types/public"
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
import type { BranchSettings, SettingsInput } from "@/types/settings"
import type {
  ManagedResource,
  ManagedTable,
  TableSettings,
} from "@/types/space"
import type { ManagedSport } from "@/types/sport"
import type {
  TelegramGroups,
  TelegramInput,
  TelegramSettings,
} from "@/types/telegram"

import { useDashboard } from "./context"

/** Base path and cache keys of the branch in the URL */
export function useBiz() {
  const id = useDashboard().branch.branch_id
  const base = `/branches/${id}`
  const key = (...parts: unknown[]): QueryKey => ["manage", id, ...parts]
  return { id, base, key }
}

const ALL = { query: { limit: 100 } }

// ---------- reads ----------

export function useSettings() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("settings"),
    queryFn: () => api<BranchSettings>(API_ENDPOINTS.BRANCH.SETTINGS(branchId)),
    // the page remounts its form when this data changes: a refocus (e.g. after the file picker) must not wipe unsaved edits
    refetchOnWindowFocus: false,
  })
}

export function useSportsList() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("sports"),
    queryFn: async () =>
      (await apiPage<ManagedSport>(API_ENDPOINTS.BRANCH.SPORTS(branchId), ALL))
        .items,
  })
}

export function useResourcesList() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("resources"),
    queryFn: async () =>
      (
        await apiPage<ManagedResource>(
          API_ENDPOINTS.BRANCH.RESOURCES(branchId),
          ALL,
        )
      ).items,
  })
}

export function useCoachesList() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("coaches"),
    queryFn: async () =>
      (await apiPage<ManagedCoach>(API_ENDPOINTS.BRANCH.COACHES(branchId), ALL))
        .items,
  })
}

/** Query options shared by the single hooks and by lists that check every court at once */
export function hoursQuery(
  biz: ReturnType<typeof useBiz>,
  owner: HoursOwner,
  id: number,
) {
  return {
    queryKey: biz.key("hours", owner, id),
    queryFn: () =>
      api<OpeningHour[]>(API_ENDPOINTS.BRANCH.OPENING_HOURS(biz.id, owner, id)),
  }
}

/** The owner's price, or null when none is set yet */
export function priceQuery(
  biz: ReturnType<typeof useBiz>,
  owner: ScheduleOwner,
  id: number,
) {
  return {
    queryKey: biz.key("price", owner, id),
    queryFn: async () => {
      try {
        return await api<Price>(API_ENDPOINTS.BRANCH.PRICES(biz.id, owner, id))
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }
    },
  }
}

export function useOpeningHours(owner: HoursOwner, id: number) {
  return useQuery(hoursQuery(useBiz(), owner, id))
}

export function usePrice(owner: ScheduleOwner, id: number) {
  return useQuery(priceQuery(useBiz(), owner, id))
}

/** A restaurant area with its tables, for the floor plan editor */
export function useFloorPlan(areaId: number) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("plan", areaId),
    queryFn: () =>
      api<FloorPlan>(API_ENDPOINTS.BRANCH.SPORT_PLAN(branchId, areaId)),
    enabled: areaId > 0,
    // the editor keeps unsaved moves in its own state: a refocus must not reset them
    refetchOnWindowFocus: false,
  })
}

/** Every area's plan of a restaurant at once (the Overview's floor plan) */
export function useAllFloorPlans(areaIds: number[]) {
  const biz = useBiz()
  return useQueries({
    queries: areaIds.map((id) => ({
      queryKey: biz.key("plan", id),
      queryFn: () =>
        api<FloorPlan>(API_ENDPOINTS.BRANCH.SPORT_PLAN(biz.id, id)),
    })),
  })
}

export function useTableSettings() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("table-settings"),
    queryFn: () =>
      api<TableSettings>(API_ENDPOINTS.BRANCH.TABLE_SETTINGS(branchId)),
    refetchOnWindowFocus: false,
  })
}

export function useEvents() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("events"),
    queryFn: () => api<EventItem[]>(API_ENDPOINTS.BRANCH.EVENTS(branchId)),
  })
}

export function useEventPrices(eventId: number) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("events", "prices", eventId),
    queryFn: () =>
      api<EventPrices>(API_ENDPOINTS.BRANCH.EVENT_PRICES(branchId, eventId)),
    refetchOnWindowFocus: false,
  })
}

export function usePaymentSettings() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("payment-settings"),
    queryFn: () =>
      api<PaymentSettings>(API_ENDPOINTS.BRANCH.PAYMENT_SETTINGS(branchId)),
    refetchOnWindowFocus: false,
  })
}

export function useTelegram() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("telegram"),
    queryFn: () =>
      api<TelegramSettings>(API_ENDPOINTS.BRANCH.TELEGRAM(branchId)),
    refetchOnWindowFocus: false,
  })
}

export function usePayInfo() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("event-pay"),
    queryFn: () => api<PayInfo>(API_ENDPOINTS.BRANCH.EVENT_PAY(branchId)),
    refetchOnWindowFocus: false,
  })
}

export function useClosures() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("closures"),
    queryFn: async () =>
      (await apiPage<Closure>(API_ENDPOINTS.BRANCH.CLOSURES(branchId), ALL))
        .items,
  })
}

/** Classes between two dates (YYYY-MM-DD, business time zone, both included) */
export function useClassList(from: string, to: string) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("classes", from, to),
    queryFn: async () =>
      (
        await apiPage<ClassSession>(
          API_ENDPOINTS.BRANCH.CLASS_SESSIONS(branchId),
          {
            query: { from, to, limit: 100 },
          },
        )
      ).items,
  })
}

/** The branch's weekly class timetables */
export function useTimetables() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("timetables"),
    queryFn: () =>
      api<Timetable[]>(API_ENDPOINTS.BRANCH.CLASS_TIMETABLES(branchId)),
  })
}

export function useRules() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("rules"),
    queryFn: () => api<Rule[]>(API_ENDPOINTS.BRANCH.RULES(branchId)),
  })
}

/** The rule in force for a sport or a court (default ← sport ← court) */
/** The company rule this branch starts from (read only here; the owner and admins change it) */
export function useCompanyRuleAtBranch() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("rules", "company"),
    queryFn: () => api<Rule>(API_ENDPOINTS.BRANCH.RULES_COMPANY(branchId)),
  })
}

export function useEffectiveRule(q: {
  sport_id?: number
  resource_id?: number
}) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("rules", "effective", q),
    queryFn: () =>
      api<EffectiveRule>(API_ENDPOINTS.BRANCH.RULES_EFFECTIVE(branchId), {
        query: q,
      }),
    retry: false,
  })
}

// ---------- changes ----------

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

export const manage = {
  saveSettings: (branchId: number, body: SettingsInput) =>
    api<BranchSettings>(API_ENDPOINTS.BRANCH.SETTINGS(branchId), {
      method: "PUT",
      body,
    }),
  publish: (branchId: number) =>
    api<BranchSettings>(API_ENDPOINTS.BRANCH.PUBLISH(branchId), {
      method: "POST",
    }),
  unpublish: (branchId: number) =>
    api<BranchSettings>(API_ENDPOINTS.BRANCH.UNPUBLISH(branchId), {
      method: "POST",
    }),

  upload: (scope: string, folder: string, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return api<Media>(API_ENDPOINTS.MEDIA.UPLOADS(scope), {
      method: "POST",
      form,
      query: { folder },
    })
  },

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

  saveEvent: (branchId: number, e: { id?: number } & EventInput) =>
    e.id
      ? api<EventItem>(API_ENDPOINTS.BRANCH.EVENT(branchId, e.id), {
          method: "PUT",
          body: e,
        })
      : api<EventItem>(API_ENDPOINTS.BRANCH.EVENTS(branchId), {
          method: "POST",
          body: e,
        }),
  deleteEvent: (branchId: number, id: number) =>
    apiMessage(API_ENDPOINTS.BRANCH.EVENT(branchId, id), { method: "DELETE" }),
  copyEvent: (
    branchId: number,
    c: { id: number; name: string; starts_on: string; ends_on: string },
  ) =>
    api<EventItem>(API_ENDPOINTS.BRANCH.EVENT_COPY(branchId, c.id), {
      method: "POST",
      body: { name: c.name, starts_on: c.starts_on, ends_on: c.ends_on },
    }),
  saveEventPrices: (branchId: number, p: { id: number } & EventPricesInput) =>
    api<EventPrices>(API_ENDPOINTS.BRANCH.EVENT_PRICES(branchId, p.id), {
      method: "PUT",
      body: {
        default_price: p.default_price,
        zones: p.zones,
        tables: p.tables,
      },
    }),
  saveTelegram: (branchId: number, body: TelegramInput) =>
    api<TelegramSettings>(API_ENDPOINTS.BRANCH.TELEGRAM(branchId), {
      method: "PUT",
      body,
    }),
  findTelegramGroups: (branchId: number, _: void) =>
    api<TelegramGroups>(API_ENDPOINTS.BRANCH.TELEGRAM_FIND_GROUPS(branchId), {
      method: "POST",
    }),
  testTelegram: (branchId: number, _: void) =>
    api<TelegramSettings>(API_ENDPOINTS.BRANCH.TELEGRAM_TEST(branchId), {
      method: "POST",
    }),
  disconnectTelegram: (branchId: number, _: void) =>
    apiMessage(API_ENDPOINTS.BRANCH.TELEGRAM(branchId), { method: "DELETE" }),
  savePayInfo: (branchId: number, body: PayInfo) =>
    api<PayInfo>(API_ENDPOINTS.BRANCH.EVENT_PAY(branchId), {
      method: "PUT",
      body,
    }),
  savePaymentSettings: (
    branchId: number,
    body: {
      online_enabled: boolean
      online_bookings?: boolean
      online_packages?: boolean
      charge_minutes: number
    },
  ) =>
    api<PaymentSettings>(API_ENDPOINTS.BRANCH.PAYMENT_SETTINGS(branchId), {
      method: "PUT",
      body,
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

  saveClass: (
    branchId: number,
    c: { id?: number } & Omit<ClassSession, "id" | "seats_left">,
  ) =>
    c.id
      ? api<ClassSession>(API_ENDPOINTS.BRANCH.CLASS_SESSION(branchId, c.id), {
          method: "PUT",
          body: c,
        })
      : api<ClassSession>(API_ENDPOINTS.BRANCH.CLASS_SESSIONS(branchId), {
          method: "POST",
          body: c,
        }),
  deleteClass: (branchId: number, id: number) =>
    apiMessage(API_ENDPOINTS.BRANCH.CLASS_SESSION(branchId, id), {
      method: "DELETE",
    }),
  saveTimetable: (branchId: number, t: { id?: number } & TimetableInput) =>
    t.id
      ? api<TimetableResult>(
          API_ENDPOINTS.BRANCH.CLASS_TIMETABLE(branchId, t.id),
          {
            method: "PUT",
            body: t,
          },
        )
      : api<TimetableResult>(API_ENDPOINTS.BRANCH.CLASS_TIMETABLES(branchId), {
          method: "POST",
          body: t,
        }),
  stopTimetable: (branchId: number, id: number) =>
    api<TimetableStop>(API_ENDPOINTS.BRANCH.CLASS_TIMETABLE(branchId, id), {
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

/** What a court or coach still needs before people can book it: opening hours and a price */
export function useReadiness(owner: ScheduleOwner, id: number) {
  const hours = useOpeningHours(owner, id)
  const price = usePrice(owner, id)
  return {
    loading: hours.isPending || price.isPending,
    hasHours: (hours.data?.length ?? 0) > 0,
    price: price.data ?? null,
  }
}
