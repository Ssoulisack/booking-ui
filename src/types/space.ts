import type { BookingStyle } from "@/types/settings"

/** what a bookable space is; the team calls them all "spaces", customers see the kind */
export type ResourceKind =
  "court" | "pitch" | "ring" | "lane" | "bay" | "table" | "room" | "other"

export interface ManagedResource extends Partial<TableFields> {
  id: number
  sport_id: number
  name: string
  kind: ResourceKind
  active: boolean
  /** restaurant tables: kept for walk-ins (customers see it as taken, events do not sell it) */
  walk_in_only?: boolean
}

export type TableShape = "round" | "square" | "long"

/** A restaurant table's seats and place on its area's floor plan (grid squares) */
export interface TableFields {
  seats: number
  /** counted only when no real-seat choice is left */
  extra_chairs: number
  shape: TableShape
  plan_x: number
  plan_y: number
  plan_w: number
  plan_h: number
  rotation: 0 | 90 | 180 | 270
}

export type ManagedTable = ManagedResource & TableFields

export type TableMode = "one_at_a_time" | "hold"

/** How a restaurant branch takes table bookings */
export interface TableSettings {
  table_mode: TableMode
  /** hold: how long a booking keeps its table for online booking */
  hold_minutes: number
  /** not arrived this long after the booking time: no-show, table free */
  late_minutes: number
  walkin_before_booking: boolean
  max_guests_online: number
  /** bigger groups wait for staff approval; null = never */
  approval_above_guests: number | null
  /** the last online booking this long before closing */
  last_call_minutes: number
  /** time: customers pick a start time; arrive_by: a bar, only the evening */
  booking_style: BookingStyle
  /** arrive_by: be there by this time (HH:MM) */
  arrive_by_time: string
  /** arrive_by: booked after that time, be there within this many minutes */
  late_booking_minutes: number
}
