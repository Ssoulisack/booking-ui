/** One line of an event's program: "19:00 – 20:30 Brand show" */
export interface LineupItem {
  /** "" = every day of the event, or one date (YYYY-MM-DD) */
  day: string
  start_time: string
  /** "" = until the end */
  end_time: string
  title: string
}

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
  /** the time of day it runs (HH:MM, "" = not said); an end before the start means after midnight */
  start_time: string
  end_time: string
  /** customers without an account may buy tables */
  accept_guests: boolean
  /** the areas it is held in; none = every area */
  area_ids: number[]
  lineup: LineupItem[]
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
  start_time: string
  end_time: string
  /** false: only customers with an account can buy tables (guests log in first) */
  accept_guests: boolean
  /** the areas it is held in; empty = the whole branch */
  areas: Array<{ id: number; name: string }>
  lineup: LineupItem[]
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
  account_name: string
  account_number: string
  transfer_enabled: boolean
}

export interface BuyEventTablesInput {
  date: string
  table_ids: number[]
  guests: number
  guest?: { name: string; phone: string; email?: string }
  notes?: string
}
