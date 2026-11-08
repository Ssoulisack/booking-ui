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
