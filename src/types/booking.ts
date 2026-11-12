import type { EventPay } from "@/types/event"
import type { SlipWay } from "@/types/package"
import type { BookingStyle } from "@/types/settings"

export type BookingStatus =
  "pending" | "confirmed" | "cancelled" | "completed" | "no_show"

export interface BookingItem {
  kind: "resource" | "coach" | "class_session"
  resource_id?: number
  coach_id?: number
  class_session_id?: number
  resource_name?: string
  coach_name?: string
  class_title?: string
  seats: number
  starts_at: string
  ends_at: string
  price: number
  /** false once let go: a cancelled booking, or a table the group moved away from before using it */
  active: boolean
}

export interface Booking {
  id: number
  code: string
  sport_id: number
  sport_name: string
  branch_name: string
  branch_slug: string
  status: BookingStatus
  starts_at: string
  ends_at: string
  total_price: number
  currency: string
  payment_status: "unpaid" | "paid"
  cancellable_until: string
  guest_name?: string
  guest_phone?: string
  customer_id?: number
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  member_no?: string // the booker's number; none for a guest
  payment_method?: PaymentMethod
  paid_at?: string
  created_by?: "customer" | "guest" | "staff"
  notes: string
  cancelled_at?: string
  cancel_reason?: string
  created_at: string
  items: BookingItem[]
  /** restaurant tables: the group size, and when the group loses its table if not there */
  guests?: number
  arrive_by?: string
  arrived_at?: string
  /** arrive_by: a bar booking for the evening (its start time means nothing to the guest) */
  booking_style?: BookingStyle
  /** restaurant tables: the floor of the area (sport_name) the tables are in */
  area_floor?: number
  /** the zones the tables stand in (e.g. "Smoking"), when booked */
  zones?: string
  /** an event booking: the event's name and the time of day it runs (HH:MM; "" = not said) */
  event_name?: string
  event_start_time?: string
  event_end_time?: string
  /** paid with a package (course pass): the customer's package, and which one ("Package A · 10 times", "P-0002") */
  customer_package_id?: number
  package?: string
  package_code?: string
  /** how the slip was sent: on WhatsApp, or uploaded here (sent to the team's Telegram group) */
  slip_via?: SlipWay
  /** event days: the event the tables were bought for, pay before, and when the customer said "I sent the slip" */
  event_id?: number
  pay_by?: string
  slip_sent_at?: string
}

export interface CreatedBooking extends Booking {
  guest_token?: string
  guest_link?: string
  /** event days: how to pay (answer to buying tables) */
  pay?: EventPay
}

export interface CreateBookingInput {
  /** restaurants: the chosen tables and the group size */
  table_ids?: number[]
  guests?: number
  resource_id?: number
  coach_id?: number
  sport_id?: number
  starts_at?: string
  duration_min?: number
  class_session_id?: number
  seats?: number
  /** pay with this package (course pass) of the customer: a class or a space, price 0 */
  package_id?: number
  guest?: { name: string; phone: string; email?: string }
  notes?: string
}

export type PaymentMethod =
  "cash" | "transfer" | "qr" | "other" | "package" | "online"

export interface StaffBookingInput extends CreateBookingInput {
  // phone, customer number (CNO000042) or email of an account
  customer?: string
}

export interface BookingFilters {
  page?: number
  limit?: number
  keyword?: string
  from?: string
  to?: string
  status?: string
  payment_status?: string
  sport_id?: number
  resource_id?: number
  coach_id?: number
  customer_id?: number
  /** "approval": pending, the team decides; "payment": event tables not paid and no slip sent yet */
  waiting?: "approval" | "payment"
}

export interface WalkInInput {
  table_ids: number[]
  guests: number
  name?: string
  phone?: string
  notes?: string
}

export interface ReserveTablesInput {
  table_ids: number[]
  guests: number
  starts_at: string
  guest: { name: string; phone: string }
  notes?: string
}
