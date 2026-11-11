import type { Province } from "@/lib/places"
import type { BranchType } from "@/types/auth"

export type BookingMode = "account" | "guest" | "both"

export interface PublicCompany {
  name: string
  logo_url: string
  cover_url: string
  brand_color: string
  ring_colors: string[]
  heading_font: string
  body_font: string
  description: string
  phone: string
  email: string
  social_links: Record<string, string> | null
  language: string
  currency: string
}

export interface PublicBranch {
  type: BranchType
  name: string
  slug: string
  company_name: string
  timezone: string
  currency: string
  language: string
  logo_url: string
  cover_url: string
  brand_color: string
  ring_colors: string[]
  heading_font: string
  body_font: string
  description: string
  address: string
  province: Province | ""
  phone: string
  map_url: string
  social_links: Record<string, string> | null
  booking_policy: string
  booking_mode: BookingMode
  require_approval: boolean
  /** the other branch at the same place ("Also at this place"); null when none is live */
  sister: SisterBranch | null
}

export interface SisterBranch {
  type: BranchType
  name: string
  slug: string
  cover_url: string
}

export interface PublicResource {
  id: number
  sport_id: number
  name: string
  kind: string
  price_per_hour: number | null
  currency?: string
  /** the coaches included free with this space (booked together, the coach costs nothing) */
  coach_ids?: number[]
}

export interface PublicCoach {
  id: number
  name: string
  bio: string
  image_url: string
  sports: Array<{ id: number; name: string }>
  price_per_hour: number | null
  currency?: string
  /** open at least one day a week: offered as a coach to book (false: closed every day) */
  bookable: boolean
  /** the coach's weekly working hours (weekday 0 = Sunday) */
  hours?: Array<{ weekday: number; open: string; close: string }>
}

export interface EffectiveRule {
  min_duration_min: number
  max_duration_min: number
  duration_step_min: number
  start_step_min: number
  cancel_before_hours: number
  max_days_ahead: number
  min_notice_min: number
  capacity: number
  max_active_bookings_per_customer: number
}

export interface Slot {
  starts_at: string
  durations_min: number[]
}

export interface Availability {
  date: string
  timezone: string
  rule: EffectiveRule
  slots: Slot[]
  currency?: string
  prices: Array<{ duration_min: number; price: number }>
}

/** One coach's free times together with a space on a day, with the price of each length (space + coach) */
export interface CoachAvailability {
  coach_id: number
  slots: Slot[]
  currency?: string
  prices: Array<{ duration_min: number; price: number }>
}

export interface AvailabilityQuery {
  date: string
  resource_id?: number
  coach_id?: number
  sport_id?: number
}
