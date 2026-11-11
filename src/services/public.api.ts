import { api, apiPage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  Booking,
  CreateBookingInput,
  CreatedBooking,
} from "@/types/booking"
import type { ClassSession } from "@/types/class"
import type {
  BuyEventTablesInput,
  PublicEvent,
  PublicEventDetail,
} from "@/types/event"
import type { PublicArea, TableAvailability } from "@/types/floor-plan"
import type { CustomerPackage, PackageItem } from "@/types/package"
import type { PaymentOption, PublicPayInfo } from "@/types/payment"
import type {
  Availability,
  AvailabilityQuery,
  CoachAvailability,
  PublicBranch,
  PublicCoach,
  PublicResource,
} from "@/types/public"
import type { Sport } from "@/types/sport"

// What a customer sees and does on a branch's public page, logged in or not

export const publicService = {
  branch: (slug: string) => api<PublicBranch>(API_ENDPOINTS.PUBLIC.ROOT(slug)),
  sports: (slug: string) => api<Sport[]>(API_ENDPOINTS.PUBLIC.SPORTS(slug)),
  resources: (slug: string) =>
    api<PublicResource[]>(API_ENDPOINTS.PUBLIC.RESOURCES(slug)),
  coaches: (slug: string) =>
    api<PublicCoach[]>(API_ENDPOINTS.PUBLIC.COACHES(slug)),

  /** Classes on one day (YYYY-MM-DD, business time zone), with seats left */
  classesOn: async (slug: string, date: string) =>
    (
      await apiPage<ClassSession>(API_ENDPOINTS.PUBLIC.CLASS_SESSIONS(slug), {
        query: { date, limit: 100 },
      })
    ).items,
  /** The next classes, soonest first */
  upcomingClasses: async (slug: string, limit: number) =>
    (
      await apiPage<ClassSession>(API_ENDPOINTS.PUBLIC.CLASS_SESSIONS(slug), {
        query: { limit },
      })
    ).items,
  classPage: (slug: string, page: number, limit: number) =>
    apiPage<ClassSession>(API_ENDPOINTS.PUBLIC.CLASS_SESSIONS(slug), {
      query: { limit, page },
    }),

  availability: (slug: string, q: AvailabilityQuery) =>
    api<Availability>(API_ENDPOINTS.PUBLIC.AVAILABILITY(slug), {
      query: { ...q },
    }),
  /** for a space on a day: the coaches free with it, each with their times */
  coachAvailability: (slug: string, q: AvailabilityQuery) =>
    api<CoachAvailability[]>(API_ENDPOINTS.PUBLIC.COACH_AVAILABILITY(slug), {
      query: { ...q },
    }),
  createBooking: (slug: string, body: CreateBookingInput) =>
    api<CreatedBooking>(API_ENDPOINTS.PUBLIC.BOOKINGS(slug), {
      method: "POST",
      body,
    }),

  // a guest's booking, by its private link or by code + phone
  guestBooking: (slug: string, token: string) =>
    api<Booking>(API_ENDPOINTS.PUBLIC.BOOKING(slug, token)),
  /** a booking without its link: the code and the phone it was made with */
  findBooking: (slug: string, code: string, phone: string) =>
    api<Booking>(API_ENDPOINTS.PUBLIC.BOOKINGS_FIND(slug), {
      method: "POST",
      body: { code, phone },
    }),
  cancelFound: (slug: string, code: string, phone: string, reason: string) =>
    api<Booking>(API_ENDPOINTS.PUBLIC.BOOKINGS_FIND_CANCEL(slug), {
      method: "POST",
      body: { code, phone, reason },
    }),
  cancelGuest: (slug: string, token: string, reason: string) =>
    api<Booking>(API_ENDPOINTS.PUBLIC.BOOKING_CANCEL(slug, token), {
      method: "POST",
      body: { reason },
    }),

  // restaurants
  floorPlans: (slug: string) =>
    api<PublicArea[]>(API_ENDPOINTS.PUBLIC.FLOOR_PLANS(slug)),
  tableAvailability: (slug: string, date: string, guests: number) =>
    api<TableAvailability>(API_ENDPOINTS.PUBLIC.TABLE_AVAILABILITY(slug), {
      query: { date, guests },
    }),
  events: (slug: string) =>
    api<PublicEvent[]>(API_ENDPOINTS.PUBLIC.EVENTS(slug)),
  eventDetail: (slug: string, id: number, date: string) =>
    api<PublicEventDetail>(API_ENDPOINTS.PUBLIC.EVENT(slug, id), {
      query: date ? { date } : undefined,
    }),
  buyEventTables: (slug: string, id: number, body: BuyEventTablesInput) =>
    api<CreatedBooking>(API_ENDPOINTS.PUBLIC.EVENT_BOOKINGS(slug, id), {
      method: "POST",
      body,
    }),

  // paying and packages
  paymentOptions: (slug: string, forPackage: boolean) =>
    api<PaymentOption[]>(API_ENDPOINTS.PUBLIC.PAYMENT_OPTIONS(slug), {
      query: forPackage ? { for: "package" } : undefined,
    }),
  /** How to pay the branch outside the system (QR, account, WhatsApp) */
  payInfo: (slug: string) =>
    api<PublicPayInfo>(API_ENDPOINTS.PUBLIC.EVENT_PAY(slug)),
  /** What the branch sells as passes: active packages with their options on sale */
  packages: (slug: string) =>
    api<PackageItem[]>(API_ENDPOINTS.PUBLIC.PACKAGES(slug)),
  buyPackage: (slug: string, packageId: number, optionId: number) =>
    api<CustomerPackage>(API_ENDPOINTS.PUBLIC.PACKAGE_BUY(slug, packageId), {
      method: "POST",
      body: { option_id: optionId },
    }),
}
