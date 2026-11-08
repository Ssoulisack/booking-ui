import type { BookingStyle } from "@/types/settings"
import type { ManagedTable, TableFields } from "@/types/space"
import type { ManagedSport } from "@/types/sport"

export type FloorItemKind =
  | "bar"
  | "pole"
  | "stage"
  | "toilet"
  | "entry"
  | "label"
  | "zone"
  | "stairs"
  | "cashier"
  | "dj"

export type ZoneColor =
  | "green"
  | "blue"
  | "amber"
  | "rose"
  | "violet"
  | "slate"
  | "orange"
  | "black"
  | "teal"
  | "lime"
  | "brown"

/** The shape of a zone: like a table (square, round, long) or an L (its box with one corner cut out) */
export type ZoneShape = "square" | "round" | "long" | "l"

/** The corner of its box an L zone is cut at: top-left, top-right, bottom-left, bottom-right */
export type CutCorner = "tl" | "tr" | "bl" | "br"

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
  /** zones only: the shape; for an L, the cut-out corner is cut_w × cut_h squares at cut_corner */
  shape: ZoneShape
  cut_w: number
  cut_h: number
  cut_corner: CutCorner
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
  /** kept for walk-ins: the booking page says so instead of drawing it as taken */
  walk_in_only?: boolean
}

/** The free start times of a day for a group, with the tables free at each */
export interface TableAvailability {
  date: string
  timezone: string
  guests: number
  max_guests_online: number
  late_minutes: number
  booking_style: BookingStyle
  /** tables kept for walk-ins: shown as "walk-in only", not "taken" (same answer as the free tables, so never out of step) */
  kept_table_ids?: number[]
  /** an event takes this day over: its tables are sold, not booked free */
  event?: {
    id: number
    name: string
    start_time: string
    end_time: string
    /** the areas it is held in; empty = the whole branch (then no table is free that day) */
    areas: Array<{ id: number; name: string }>
  }
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
