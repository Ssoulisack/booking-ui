import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query"

import { api, apiMessage, apiPage, ApiError } from "@/lib/api/client"
import type {
  BranchSettings,
  ClassSession,
  Closure,
  ManagedCoach,
  ManagedResource,
  ManagedSport,
  ManagedTable,
  FloorItem,
  FloorPlan,
  HoursOwner,
  TableSettings,
  Media,
  OpeningHour,
  Price,
  Timetable,
  TimetableInput,
  TimetableResult,
  TimetableStop,
  Rule,
  RuleFields,
  RuleScope,
  ScheduleOwner,
  SettingsInput,
  EffectiveRule,
  EventInput,
  TelegramGroups,
  TelegramInput,
  TelegramSettings,
  EventItem,
  EventPrices,
  EventPricesInput,
  PayInfo,
  PaymentSettings,
} from "@/lib/api/types"

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
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("settings"),
    queryFn: () => api<BranchSettings>(`${base}/settings`),
    // the page remounts its form when this data changes: a refocus (e.g. after the file picker) must not wipe unsaved edits
    refetchOnWindowFocus: false,
  })
}

export function useSportsList() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("sports"),
    queryFn: async () =>
      (await apiPage<ManagedSport>(`${base}/sports`, ALL)).items,
  })
}

export function useResourcesList() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("resources"),
    queryFn: async () =>
      (await apiPage<ManagedResource>(`${base}/resources`, ALL)).items,
  })
}

export function useCoachesList() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("coaches"),
    queryFn: async () =>
      (await apiPage<ManagedCoach>(`${base}/coaches`, ALL)).items,
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
      api<OpeningHour[]>(`${biz.base}/opening-hours/${owner}/${id}`),
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
        return await api<Price>(`${biz.base}/prices/${owner}/${id}`)
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
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("plan", areaId),
    queryFn: () => api<FloorPlan>(`${base}/sports/${areaId}/plan`),
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
      queryFn: () => api<FloorPlan>(`${biz.base}/sports/${id}/plan`),
    })),
  })
}

export function useTableSettings() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("table-settings"),
    queryFn: () => api<TableSettings>(`${base}/table-settings`),
    refetchOnWindowFocus: false,
  })
}

export function useEvents() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("events"),
    queryFn: () => api<EventItem[]>(`${base}/events`),
  })
}

export function useEventPrices(eventId: number) {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("events", "prices", eventId),
    queryFn: () => api<EventPrices>(`${base}/events/${eventId}/prices`),
    refetchOnWindowFocus: false,
  })
}

export function usePaymentSettings() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("payment-settings"),
    queryFn: () => api<PaymentSettings>(`${base}/payment-settings`),
    refetchOnWindowFocus: false,
  })
}

export function useTelegram() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("telegram"),
    queryFn: () => api<TelegramSettings>(`${base}/telegram`),
    refetchOnWindowFocus: false,
  })
}

export function usePayInfo() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("event-pay"),
    queryFn: () => api<PayInfo>(`${base}/event-pay`),
    refetchOnWindowFocus: false,
  })
}

export function useClosures() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("closures"),
    queryFn: async () =>
      (await apiPage<Closure>(`${base}/closures`, ALL)).items,
  })
}

/** Classes between two dates (YYYY-MM-DD, business time zone, both included) */
export function useClassList(from: string, to: string) {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("classes", from, to),
    queryFn: async () =>
      (
        await apiPage<ClassSession>(`${base}/class-sessions`, {
          query: { from, to, limit: 100 },
        })
      ).items,
  })
}

/** The branch's weekly class timetables */
export function useTimetables() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("timetables"),
    queryFn: () => api<Timetable[]>(`${base}/class-timetables`),
  })
}

export function useRules() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("rules"),
    queryFn: () => api<Rule[]>(`${base}/rules`),
  })
}

/** The rule in force for a sport or a court (default ← sport ← court) */
/** The company rule this branch starts from (read only here; the owner and admins change it) */
export function useCompanyRuleAtBranch() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("rules", "company"),
    queryFn: () => api<Rule>(`${base}/rules/company`),
  })
}

export function useEffectiveRule(q: {
  sport_id?: number
  resource_id?: number
}) {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("rules", "effective", q),
    queryFn: () => api<EffectiveRule>(`${base}/rules/effective`, { query: q }),
    retry: false,
  })
}

// ---------- changes ----------

/**
 * A change to this branch. After it succeeds, the listed caches are refreshed (plus the public
 * pages, which most changes affect).
 */
export function useChange<I, O>(
  fn: (base: string, input: I) => Promise<O>,
  refresh: string[],
) {
  const { base, key } = useBiz()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: I) => fn(base, input),
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
  saveSettings: (base: string, body: SettingsInput) =>
    api<BranchSettings>(`${base}/settings`, { method: "PUT", body }),
  publish: (base: string) =>
    api<BranchSettings>(`${base}/publish`, { method: "POST" }),
  unpublish: (base: string) =>
    api<BranchSettings>(`${base}/unpublish`, { method: "POST" }),

  upload: (base: string, folder: string, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return api<Media>(`${base}/uploads`, {
      method: "POST",
      form,
      query: { folder },
    })
  },

  saveSport: (
    base: string,
    s: { id?: number } & Omit<
      ManagedSport,
      "id" | "slug" | "image_url" | "plan_width" | "plan_height" | "floor"
    > &
      Partial<Pick<ManagedSport, "plan_width" | "plan_height" | "floor">>,
  ) =>
    s.id
      ? api<ManagedSport>(`${base}/sports/${s.id}`, { method: "PUT", body: s })
      : api<ManagedSport>(`${base}/sports`, { method: "POST", body: s }),
  deleteSport: (base: string, id: number) =>
    apiMessage(`${base}/sports/${id}`, { method: "DELETE" }),

  saveResource: (
    base: string,
    r: { id?: number } & Omit<ManagedResource, "id">,
  ) =>
    r.id
      ? api<ManagedResource>(`${base}/resources/${r.id}`, {
          method: "PUT",
          body: r,
        })
      : api<ManagedResource>(`${base}/resources`, { method: "POST", body: r }),
  deleteResource: (base: string, id: number) =>
    apiMessage(`${base}/resources/${id}`, { method: "DELETE" }),

  /** Saves an area's plan size and where every table stands, at once */
  saveFloorPlan: (
    base: string,
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
    api<FloorPlan>(`${base}/sports/${p.areaId}/plan`, {
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
  saveTableSettings: (base: string, body: TableSettings) =>
    api<TableSettings>(`${base}/table-settings`, { method: "PUT", body }),

  saveCoach: (
    base: string,
    c: { id?: number; sport_ids: number[] } & Omit<
      ManagedCoach,
      "id" | "sports" | "image_url"
    >,
  ) =>
    c.id
      ? api<ManagedCoach>(`${base}/coaches/${c.id}`, { method: "PUT", body: c })
      : api<ManagedCoach>(`${base}/coaches`, { method: "POST", body: c }),
  deleteCoach: (base: string, id: number) =>
    apiMessage(`${base}/coaches/${id}`, { method: "DELETE" }),

  saveHours: (
    base: string,
    p: { owner: HoursOwner; id: number; hours: OpeningHour[] },
  ) =>
    api<OpeningHour[]>(`${base}/opening-hours/${p.owner}/${p.id}`, {
      method: "PUT",
      body: { hours: p.hours },
    }),
  savePrice: (
    base: string,
    p: {
      owner: ScheduleOwner
      id: number
      price_per_hour: number
      currency: string
    },
  ) =>
    api<Price>(`${base}/prices/${p.owner}/${p.id}`, {
      method: "PUT",
      body: { price_per_hour: p.price_per_hour, currency: p.currency },
    }),

  saveEvent: (base: string, e: { id?: number } & EventInput) =>
    e.id
      ? api<EventItem>(`${base}/events/${e.id}`, { method: "PUT", body: e })
      : api<EventItem>(`${base}/events`, { method: "POST", body: e }),
  deleteEvent: (base: string, id: number) =>
    apiMessage(`${base}/events/${id}`, { method: "DELETE" }),
  copyEvent: (
    base: string,
    c: { id: number; name: string; starts_on: string; ends_on: string },
  ) =>
    api<EventItem>(`${base}/events/${c.id}/copy`, {
      method: "POST",
      body: { name: c.name, starts_on: c.starts_on, ends_on: c.ends_on },
    }),
  saveEventPrices: (base: string, p: { id: number } & EventPricesInput) =>
    api<EventPrices>(`${base}/events/${p.id}/prices`, {
      method: "PUT",
      body: {
        default_price: p.default_price,
        zones: p.zones,
        tables: p.tables,
      },
    }),
  saveTelegram: (base: string, body: TelegramInput) =>
    api<TelegramSettings>(`${base}/telegram`, { method: "PUT", body }),
  findTelegramGroups: (base: string, _: void) =>
    api<TelegramGroups>(`${base}/telegram/find-groups`, { method: "POST" }),
  testTelegram: (base: string, _: void) =>
    api<TelegramSettings>(`${base}/telegram/test`, { method: "POST" }),
  disconnectTelegram: (base: string, _: void) =>
    apiMessage(`${base}/telegram`, { method: "DELETE" }),
  savePayInfo: (base: string, body: PayInfo) =>
    api<PayInfo>(`${base}/event-pay`, { method: "PUT", body }),
  savePaymentSettings: (
    base: string,
    body: { online_enabled: boolean; charge_minutes: number },
  ) =>
    api<PaymentSettings>(`${base}/payment-settings`, { method: "PUT", body }),

  saveClosure: (base: string, c: { id?: number } & Omit<Closure, "id">) =>
    c.id
      ? api<Closure>(`${base}/closures/${c.id}`, { method: "PUT", body: c })
      : api<Closure>(`${base}/closures`, { method: "POST", body: c }),
  deleteClosure: (base: string, id: number) =>
    apiMessage(`${base}/closures/${id}`, { method: "DELETE" }),

  saveClass: (
    base: string,
    c: { id?: number } & Omit<ClassSession, "id" | "seats_left">,
  ) =>
    c.id
      ? api<ClassSession>(`${base}/class-sessions/${c.id}`, {
          method: "PUT",
          body: c,
        })
      : api<ClassSession>(`${base}/class-sessions`, {
          method: "POST",
          body: c,
        }),
  deleteClass: (base: string, id: number) =>
    apiMessage(`${base}/class-sessions/${id}`, { method: "DELETE" }),
  saveTimetable: (base: string, t: { id?: number } & TimetableInput) =>
    t.id
      ? api<TimetableResult>(`${base}/class-timetables/${t.id}`, {
          method: "PUT",
          body: t,
        })
      : api<TimetableResult>(`${base}/class-timetables`, {
          method: "POST",
          body: t,
        }),
  stopTimetable: (base: string, id: number) =>
    api<TimetableStop>(`${base}/class-timetables/${id}`, { method: "DELETE" }),

  saveRule: (
    base: string,
    r: { scope: RuleScope; id: number; fields: RuleFields },
  ) =>
    api<Rule>(`${base}/rules/${r.scope}/${r.id}`, {
      method: "PUT",
      body: r.fields,
    }),
  deleteRule: (base: string, r: { scope: RuleScope; id: number }) =>
    apiMessage(`${base}/rules/${r.scope}/${r.id}`, { method: "DELETE" }),
}

/** Mutation helper for one delete button: closes its dialog when done */
export function useDelete(
  fn: (base: string, id: number) => Promise<unknown>,
  onDone: () => void,
) {
  const { base } = useBiz()
  return useMutation({
    mutationFn: (id: number) => fn(base, id),
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
