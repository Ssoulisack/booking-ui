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

/** What a branch takes bookings for: courts (sport) or tables (restaurant, bar, café) */
export type BranchType = "sport" | "restaurant"

export interface MyBranch {
  branch_id: number
  type: BranchType
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
  /** up to 4 colours for the rings; empty = made from the brand colour */
  ring_colors: string[]
  /** keys of FONTS (features/public/look.ts); "" = the default */
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
  guest?: { name: string; phone: string; email?: string }
  notes?: string
}

// ---------- branch dashboard: setup ----------

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

export interface ManagedSport {
  id: number
  name: string
  slug: string
  description: string
  image_key: string
  image_url: string
  active: boolean
  type: SportType
  /** restaurant areas: floor plan size in grid squares (0 at sport branches) */
  plan_width: number
  plan_height: number
  /** restaurant areas: 0 = ground floor, 1 = first floor, -1 = basement */
  floor: number
}

/** what a bookable space is; the team calls them all "spaces", customers see the kind */
export type ResourceKind =
  "court" | "pitch" | "ring" | "lane" | "bay" | "table" | "room" | "other"

export interface ManagedResource extends Partial<TableFields> {
  id: number
  sport_id: number
  name: string
  kind: ResourceKind
  active: boolean
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

export type FloorItemKind =
  "bar" | "pole" | "stage" | "toilet" | "entry" | "label" | "zone" | "stairs"

export type ZoneColor = "green" | "blue" | "amber" | "rose" | "violet" | "slate"

/** Something drawn on the floor plan that is not booked (customers see it too) */
export interface FloorItem {
  /** new, not yet saved objects have a negative id */
  id: number
  kind: FloorItemKind
  label: string
  /** zones only */
  color: ZoneColor | ""
  plan_x: number
  plan_y: number
  plan_w: number
  plan_h: number
  rotation: 0 | 90 | 180 | 270
  /** stairs only: the floor they lead to */
  target_floor: number | null
}

/** A restaurant area as customers see it */
export interface PublicArea {
  id: number
  name: string
  floor: number
  plan_width: number
  plan_height: number
  tables: PublicTable[]
  items: FloorItem[]
}

export interface PublicTable extends TableFields {
  id: number
  name: string
}

/** The free start times of a day for a group, with the tables free at each */
export interface TableAvailability {
  date: string
  timezone: string
  guests: number
  max_guests_online: number
  late_minutes: number
  booking_style: BookingStyle
  /** an event takes this day over: its tables are sold, not booked free */
  event?: { id: number; name: string }
  times: Array<{
    starts_at: string
    /** not there by then: the table goes to others */
    arrive_by: string
    free_table_ids: number[]
    /** nothing can seat the group on real seats: a table with extra chairs may be chosen */
    extra_chairs_allowed: boolean
  }>
}

/** An area with every table and object on its floor plan */
export interface FloorPlan {
  area: ManagedSport
  tables: ManagedTable[]
  items: FloorItem[]
}

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

export type BookingStyle = "time" | "arrive_by"

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

export interface RepeatClassResult {
  created: number
  sessions: ClassSession[]
  skipped: Array<{ date: string; reason: string }>
}

/** A class that repeats every week; its classes are made automatically 30 days ahead */
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

/** The providers switched on for this install; an empty id means off */
export interface SocialConfig {
  google_client_id: string
  facebook_app_id: string
}

export interface Media {
  key: string
  url: string
}

/** A file in the media library; used_by lists what shows it (empty: safe to delete) */
export interface MediaItem extends Media {
  size_bytes: number
  created_at: string
  used_by: Array<{ kind: "sport" | "coach" | "cover" | "logo"; name: string }>
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
  type: BranchType
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

// ---------- events (restaurant event days) ----------

/** An event as the team sees it, with how its bookings stand */
export interface EventItem {
  id: number
  name: string
  description: string
  starts_on: string
  ends_on: string
  background_key: string
  background_url?: string
  ad_key: string
  ad_url?: string
  hold_minutes: number
  big_booking_tables: number
  big_hold_minutes: number
  default_price: number
  published: boolean
  currency: string
  waiting: number
  paid: number
  cancelled: number
}

export type EventInput = Omit<
  EventItem,
  | "id"
  | "background_url"
  | "ad_url"
  | "currency"
  | "waiting"
  | "paid"
  | "cancelled"
>

export interface ZonePrice {
  item_id: number
  area_id: number
  label: string
  color: string
  price: number | null
}

export interface TablePrice {
  table_id: number
  area_id: number
  name: string
  seats: number
  own: number | null
  price: number
}

/** An event's prices: the default, a price per zone, a price on one table; `price` is what each table is sold at */
export interface EventPrices {
  default_price: number
  currency: string
  zones: ZonePrice[]
  tables: TablePrice[]
}

export interface EventPricesInput {
  default_price: number
  zones: { item_id: number; price: number }[]
  tables: { table_id: number; price: number }[]
}

/** How customers pay the branch for event tables */
export interface PayInfo {
  whatsapp: string
  qr_key: string
  qr_url?: string
  note: string
}

// ---------- events (public) ----------

/** An event card (the small ad) on the branch page */
export interface PublicEvent {
  id: number
  name: string
  description: string
  starts_on: string
  ends_on: string
  background_url?: string
  ad_url?: string
  /** the cheapest table for sale (0: none) */
  from_price: number
  currency: string
}

/** One table of the event day: its price (0: not for sale) and whether it is taken */
export interface SaleTable {
  id: number
  price: number
  sold: boolean
}

export interface PublicEventDetail extends PublicEvent {
  days: string[]
  date: string
  opens_at?: string
  closes_at?: string
  tables: SaleTable[]
  hold_minutes: number
  big_booking_tables: number
  big_hold_minutes: number
}

/** The total, how long the tables are held, and where to pay */
export interface EventPay {
  total: number
  currency: string
  hold_until?: string
  big_booking: boolean
  whatsapp: string
  qr_url?: string
  note: string
}

export interface BuyEventTablesInput {
  date: string
  table_ids: number[]
  guests: number
  guest?: { name: string; phone: string; email?: string }
  notes?: string
}
