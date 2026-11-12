import { api, apiPage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  Booking,
  BookingFilters,
  BookingStatus,
  PaymentMethod,
  ReserveTablesInput,
  StaffBookingInput,
  WalkInInput,
} from "@/types/booking"
import type { Calendar } from "@/types/calendar"
import type { TableAvailability } from "@/types/floor-plan"
import type { Availability } from "@/types/public"

// The desk: what the team does with a branch's bookings

export const bookingService = {
  list: (branchId: number, q: BookingFilters) =>
    apiPage<Booking>(API_ENDPOINTS.BRANCH.BOOKINGS(branchId), {
      query: { ...q },
    }),
  /** One page with one row: only its total matters (the badge on the Bookings menu) */
  pending: (branchId: number, waiting: "approval" | "payment" = "approval") =>
    apiPage<Booking>(API_ENDPOINTS.BRANCH.BOOKINGS(branchId), {
      query: { waiting, limit: 1 },
    }),
  get: (branchId: number, id: number) =>
    api<Booking>(API_ENDPOINTS.BRANCH.BOOKING(branchId, id)),
  /** Courts and coaches side by side, `days` days from `date` (1 to 7) */
  calendar: (branchId: number, date: string, days: number) =>
    api<Calendar>(API_ENDPOINTS.BRANCH.CALENDAR(branchId), {
      query: { date, days },
    }),
  /** Free starts staff may book (no notice or days-ahead limit), with prices */
  availability: (
    branchId: number,
    q: {
      date: string
      resource_id?: number
      coach_id?: number
      sport_id?: number
    },
  ) =>
    api<Availability>(API_ENDPOINTS.BRANCH.AVAILABILITY(branchId), {
      query: { ...q },
    }),
  /** The free times and tables of a day for a group, as the team sees them (kept tables included) */
  tableAvailability: (branchId: number, date: string, guests: number) =>
    api<TableAvailability>(API_ENDPOINTS.BRANCH.TABLE_AVAILABILITY(branchId), {
      query: { date, guests },
    }),

  create: (branchId: number, body: StaffBookingInput) =>
    api<Booking>(API_ENDPOINTS.BRANCH.BOOKINGS(branchId), {
      method: "POST",
      body,
    }),
  setStatus: (
    branchId: number,
    p: { id: number; status: BookingStatus; reason?: string },
  ) =>
    api<Booking>(API_ENDPOINTS.BRANCH.BOOKING_STATUS(branchId, p.id), {
      method: "POST",
      body: { status: p.status, reason: p.reason ?? "" },
    }),
  setPayment: (
    branchId: number,
    p: { id: number; status: "paid" | "unpaid"; method?: PaymentMethod },
  ) =>
    api<Booking>(API_ENDPOINTS.BRANCH.BOOKING_PAYMENT(branchId, p.id), {
      method: "POST",
      body: { status: p.status, method: p.method ?? "" },
    }),

  // restaurants: the group came in, other tables, a group without booking
  markArrived: (branchId: number, id: number) =>
    api<Booking>(API_ENDPOINTS.BRANCH.BOOKING_ARRIVED(branchId, id), {
      method: "POST",
    }),
  moveTables: (branchId: number, p: { id: number; table_ids: number[] }) =>
    api<Booking>(API_ENDPOINTS.BRANCH.BOOKING_MOVE(branchId, p.id), {
      method: "POST",
      body: { table_ids: p.table_ids },
    }),
  walkIn: (branchId: number, body: WalkInInput) =>
    api<Booking>(API_ENDPOINTS.BRANCH.WALK_INS(branchId), {
      method: "POST",
      body,
    }),
  /** Book tables for a customer who phoned: confirmed at once */
  reserveTables: (branchId: number, body: ReserveTablesInput) =>
    api<Booking>(API_ENDPOINTS.BRANCH.BOOKINGS(branchId), {
      method: "POST",
      body,
    }),
}
