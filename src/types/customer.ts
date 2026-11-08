export interface Customer {
  user_id: number
  member_no: string
  name: string
  email: string
  phone: string
  bookings: number
  last_booking_at: string
}

/** The account staff found before booking for it */
export interface CustomerMatch {
  user_id: number
  member_no: string
  name: string
  phone: string
  email?: string
}
