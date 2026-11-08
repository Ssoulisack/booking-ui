import type { Province } from "@/lib/places"
import type { BranchStatus, BranchType } from "@/types/auth"
import type { BookingMode } from "@/types/public"

/** A branch's own settings; the four overrides are null when the company's apply */
export interface SettingsInput {
  name: string
  slug: string
  /** can change only until the first publish */
  type: BranchType
  cover_key: string
  description: string
  address: string
  province: Province | ""
  phone: string
  map_url: string
  social_links: Record<string, string> | null
  /** "Also at this place": another branch of the company; null = none */
  sister_branch_id: number | null
  timezone: string | null
  booking_mode: BookingMode | null
  booking_policy: string | null
  require_approval: boolean | null
  /** the look: null = the company's */
  ring_colors: string[] | null
  heading_font: string | null
  body_font: string | null
}

export interface BranchSettings extends SettingsInput {
  id: number
  status: BranchStatus
  cover_url: string
  company_name: string
  /** what applies at the branch after its overrides */
  in_force: {
    timezone: string
    currency: string
    language: string
    booking_mode: BookingMode
    booking_policy: string
    require_approval: boolean
    ring_colors: string[]
    heading_font: string
    body_font: string
  }
  public_path: string
  published_at: string | null
}

export type BookingStyle = "time" | "arrive_by"

/** The providers switched on for this install; an empty id means off */
export interface SocialConfig {
  google_client_id: string
  facebook_app_id: string
}
