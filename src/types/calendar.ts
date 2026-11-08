import type { BookingStatus } from "@/types/booking"

export interface CalendarEntry {
  kind: "booking" | "class" | "closure"
  starts_at: string
  ends_at: string
  booking_id?: number
  code?: string
  status?: BookingStatus
  name?: string
  paid?: boolean
  class_id?: number
  title?: string
  seats_taken?: number
  capacity?: number
  reason?: string
  /** restaurant bookings: people in the group, and whether staff marked them arrived */
  guests?: number
  arrived?: boolean
}

export interface CalendarLane {
  owner_type: "resource" | "coach"
  owner_id: number
  name: string
  /** the sport (sport branches) or area (restaurants) of a court / table; 0 for coaches */
  group_id: number
  group_name: string
  floor: number
  /** restaurant tables */
  seats: number
  entries: CalendarEntry[]
}

export interface Calendar {
  from: string
  to: string
  timezone: string
  lanes: CalendarLane[]
}
