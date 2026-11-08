import type { ClassSession } from "@/types/class"

export type ScheduleOwner = "resource" | "coach"

/** Whose opening hours: a court, a coach, or (restaurants) the whole place, id 0 */
export type HoursOwner = ScheduleOwner | "venue"

export interface OpeningHour {
  weekday: number // 0 = Sunday
  open: string // HH:MM
  close: string // HH:MM
}

export interface Price {
  owner_type: ScheduleOwner
  owner_id: number
  price_per_hour: number
  currency: string
}

export interface Closure {
  id: number
  owner_type: "venue" | ScheduleOwner
  owner_id: number
  starts_at: string
  ends_at: string
  reason: string
  // answer to adding a closed time: weekly classes in it without bookings were removed,
  // these have bookings and were kept (staff contact the customers)
  classes_removed?: number
  classes_kept?: ClassSession[]
}

export interface RuleFields {
  min_duration_min: number | null
  max_duration_min: number | null
  duration_step_min: number | null
  start_step_min: number | null
  cancel_before_hours: number | null
  max_days_ahead: number | null
  min_notice_min: number | null
  capacity: number | null
  max_active_bookings_per_customer: number | null
}

/** "branch" (id 0) holds one branch's changes to the company rule */
export type RuleScope = "company" | "branch" | "sport" | "resource"

export interface Rule extends RuleFields {
  scope_type: RuleScope
  scope_id: number
}
