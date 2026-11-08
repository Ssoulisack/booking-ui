import { api, apiMessage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  EventInput,
  EventItem,
  EventPrices,
  EventPricesInput,
} from "@/types/event"

export const eventService = {
  list: (branchId: number) =>
    api<EventItem[]>(API_ENDPOINTS.BRANCH.EVENTS(branchId)),
  prices: (branchId: number, eventId: number) =>
    api<EventPrices>(API_ENDPOINTS.BRANCH.EVENT_PRICES(branchId, eventId)),
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
}
