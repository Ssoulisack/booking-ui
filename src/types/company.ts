import type { Province } from "@/lib/places"
import type { BranchStatus, BranchType } from "@/types/auth"
import type { BookingMode } from "@/types/public"
import type { FinanceTotals } from "@/types/report"

export interface CompanyInput {
  name: string
  logo_key: string
  cover_key: string
  brand_color: string
  /** up to 4 colours for the rings; empty = made from the brand colour */
  ring_colors: string[]
  /** keys of FONTS (components/public/booking/look.ts); "" = the default */
  heading_font: string
  body_font: string
  description: string
  phone: string
  email: string
  social_links: Record<string, string> | null
  language: string
  currency: string
  timezone: string
  booking_mode: BookingMode
  booking_policy: string
  require_approval: boolean
}

export interface Company extends CompanyInput {
  logo_url: string
  cover_url: string
}

export interface BranchSummary {
  id: number
  type: BranchType
  name: string
  slug: string
  status: BranchStatus
  address: string
  province: Province | ""
  public_path: string
  published_at: string | null
  created_at: string
}

export interface BranchRef {
  id: number
  name: string
}

export interface CompanyReport {
  from: string
  to: string
  bookings: number
  totals: FinanceTotals[]
  branches: Array<{
    branch_id: number
    name: string
    status: BranchStatus
    bookings: number
    totals: FinanceTotals[]
  }>
}
