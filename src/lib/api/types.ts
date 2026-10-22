// Shapes returned by booking-system-backend (internal/core/dto)

export interface Envelope<T> {
  success: boolean
  message?: string
  data?: T
  meta?: PageMeta
}

import type { Province, SportType } from "@/lib/places"

export interface PageMeta {
  total: number
  page: number
  limit: number
  total_page: number
}

export interface Page<T> {
  items: T[]
  meta: PageMeta
}

export interface User {
  id: number
  email: string
  avatar: string
  name: string
  username: string
  phone: string
  company_role: CompanyRole // "owner" / "admin" run every branch; "" for everyone else
  nationality: string // ISO code ("LA"); empty until chosen
  email_generated: boolean // the email is a stand-in: no real address yet
  // the number this person tells staff; one is set, by role
  member_no: string // what this person tells staff: CNO000042 (customer) or ENO000007 (the team)
  status: boolean
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

export type CompanyRole = "" | "owner" | "admin"
/** Roles at one branch (manager, staff) */
export type MemberRole = "manager" | "staff"
/** What someone is at a branch: the owner and admins act at every branch */
export type BranchRole = "owner" | "admin" | MemberRole

export type BranchStatus = "draft" | "published" | "closed"

export interface MyBranch {
  branch_id: number
  name: string
  slug: string
  status: BranchStatus
  role: BranchRole
  active: boolean
}

export interface InvitationInfo {
  company_name: string
  email: string
  role: "admin" | MemberRole
  branches: string[] // empty for an admin (every branch)
  account_exists: boolean
}

// ---------- company (owner / admins) ----------

export interface CompanyInput {
  name: string
  logo_key: string
  cover_key: string
  brand_color: string
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

export interface TeamMember {
  user_id: number
  member_no: string // "ENO000007"
  name: string
  email: string
  phone: string
  role: CompanyRole | MemberRole
  branches: BranchRef[]
  active: boolean
}

export interface TeamMemberInput {
  role: "admin" | MemberRole
  branch_ids: number[]
  active: boolean
}

export interface Invitation {
  id: number
  email: string
  role: "admin" | MemberRole
  branches: BranchRef[]
  expires_at: string
}

export interface InviteInput {
  email: string
  role: "admin" | MemberRole
  branch_ids: number[]
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

// ---------- public booking page ----------

export type BookingMode = "account" | "guest" | "both"

export interface PublicCompany {
  name: string
  logo_url: string
  cover_url: string
  brand_color: string
  description: string
  phone: string
  email: string
  social_links: Record<string, string> | null
  language: string
  currency: string
}

export interface PublicBranch {
  name: string
  slug: string
  company_name: string
  timezone: string
  currency: string
  language: string
  logo_url: string
  cover_url: string
  brand_color: string
  description: string
  address: string
  province: Province | ""
  phone: string
  map_url: string
  social_links: Record<string, string> | null
  booking_policy: string
  booking_mode: BookingMode
  require_approval: boolean
}

export interface Sport {
  id: number
  name: string
  slug: string
  description: string
  image_url: string
  type: SportType
}

export interface PublicResource {
  id: number
  sport_id: number
  name: string
  kind: string
  price_per_hour: number | null
  currency?: string
}

export interface PublicCoach {
  id: number
  name: string
  bio: string
  image_url: string
  sports: Array<{ id: number; name: string }>
  price_per_hour: number | null
  currency?: string
}

export interface ClassSession {
  id: number
  sport_id: number
  coach_id: number | null
  resource_id: number | null
  title: string
  starts_at: string
  ends_at: string
  capacity: number
  price: number
  currency: string
  active?: boolean // dashboard lists only
  seats_left?: number // public lists only
  timetable_id?: number | null // the weekly timetable that made it (dashboard)
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
}

export interface CreatedBooking extends Booking {
  guest_token?: string
  guest_link?: string
}

export interface CreateBookingInput {
  resource_id?: number
  coach_id?: number
  sport_id?: number
  starts_at?: string
  duration_min?: number
  class_session_id?: number
  seats?: number
  guest?: { name: string; phone: string; email?: string }
  notes?: string
}

// ---------- branch dashboard: setup ----------

/** A branch's own settings; the four overrides are null when the company's apply */
export interface SettingsInput {
  name: string
  slug: string
  cover_key: string
  description: string
  address: string
  province: Province | ""
  phone: string
  map_url: string
  social_links: Record<string, string> | null
  timezone: string | null
  booking_mode: BookingMode | null
  booking_policy: string | null
  require_approval: boolean | null
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
  }
  public_path: string
  published_at: string | null
}

export interface ManagedSport {
  id: number
  name: string
  slug: string
  description: string
  image_key: string
  image_url: string
  active: boolean
  type: SportType
}

/** what a bookable space is; the team calls them all "spaces", customers see the kind */
export type ResourceKind =
  "court" | "pitch" | "ring" | "lane" | "bay" | "table" | "room" | "other"

export interface ManagedResource {
  id: number
  sport_id: number
  name: string
  kind: ResourceKind
  active: boolean
}

export interface ManagedCoach {
  id: number
  name: string
  bio: string
  phone: string
  image_key: string
  image_url: string
  active: boolean
  sports: Array<{ id: number; name: string }>
}

export type ScheduleOwner = "resource" | "coach"

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

export interface RepeatClassResult {
  created: number
  sessions: ClassSession[]
  skipped: Array<{ date: string; reason: string }>
}

/** A class that repeats every week; its classes are made automatically 60 days ahead */
export interface Timetable {
  id: number
  sport_id: number
  coach_id: number | null
  resource_id: number | null
  title: string
  start_time: string // HH:MM
  end_time: string
  weekdays: number[] // 0 = Sunday
  starts_on: string // YYYY-MM-DD
  ends_on: string // "" = no end
  capacity: number
  price: number
  currency: string
  active: boolean
  filled_until: string // classes are made up to this day
}

export type TimetableInput = Omit<Timetable, "id" | "filled_until">

export interface TimetableResult {
  timetable: Timetable
  created: number
  skipped: Array<{ date: string; reason: "closed" | "taken" }>
  kept_booked: number // classes with bookings that kept their old details
}

export interface TimetableStop {
  removed: number
  kept_booked: number
}

export interface Media {
  key: string
  url: string
}

// ---------- branch dashboard: desk and reports ----------

export type PaymentMethod = "cash" | "transfer" | "qr" | "other"

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
}

export interface CalendarLane {
  owner_type: "resource" | "coach"
  owner_id: number
  name: string
  entries: CalendarEntry[]
}

export interface Calendar {
  from: string
  to: string
  timezone: string
  lanes: CalendarLane[]
}

export interface Customer {
  user_id: number
  member_no: string
  name: string
  email: string
  phone: string
  bookings: number
  last_booking_at: string
}

export interface StaffBookingInput extends CreateBookingInput {
  // phone, customer number (CNO000042) or email of an account
  customer?: string
}

/** The account staff found before booking for it */
export interface CustomerMatch {
  user_id: number
  member_no: string
  name: string
  phone: string
  email?: string
}

export interface Money {
  currency: string
  amount: number
}

export interface BookingsReport {
  from: string
  to: string
  total: number
  by_status: Record<string, number>
  per_day: Array<{
    date: string
    total: number
    by_status: Record<string, number>
  }>
  per_sport: Array<{ sport_id: number; name: string; total: number }>
  booked_value: Money[]
  top_customers: Array<{
    name: string
    contact: string
    bookings: number
    value: Money[]
  }>
}

export interface Utilisation {
  from: string
  to: string
  resources: Array<{
    resource_id: number
    name: string
    open_minutes: number
    booked_minutes: number
    percent: number
  }>
}

export interface FinanceTotals {
  currency: string
  booked_value: number
  paid: number
  outstanding: number
  upcoming_unpaid: number
  lost_cancelled: number
  lost_no_show: number
}

export interface Finance {
  from: string
  to: string
  totals: FinanceTotals[]
  per_day: Array<{
    date: string
    currency: string
    booked_value: number
    paid: number
  }>
}

export interface UnpaidRow {
  booking_id: number
  code: string
  starts_at: string
  status: BookingStatus
  name: string
  phone: string
  email: string
  amount: number
  currency: string
}

export interface CashUp {
  date: string
  totals: Money[]
  by_method: Array<{
    method: PaymentMethod
    currency: string
    count: number
    amount: number
  }>
  by_staff: Array<{
    user_id: number
    name: string
    currency: string
    count: number
    amount: number
  }>
  payments: Array<{
    code: string
    name: string
    method: PaymentMethod
    amount: number
    currency: string
    paid_at: string
    paid_by: string
  }>
}

// ---------- public home: the live branches ----------

export interface DirectoryBranch {
  name: string
  slug: string
  cover_url: string
  address: string
  province: Province | ""
  sports: Array<{ name: string; type: SportType }>
  /** lowest hourly court price; null when no court has a price yet */
  from_price: number | null
  currency: string
}
