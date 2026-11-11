import type { CustomerPackage } from "@/types/package"

export interface Customer {
  user_id: number
  member_no: string
  name: string
  email: string
  /** the email was proven with a code (false when there is none) */
  email_verified?: boolean
  phone: string
  bookings: number
  last_booking_at: string
}

/** A customer who bought a package here, with those packages (the Membership tab) */
export interface Member {
  user_id: number
  member_no: string
  name: string
  email: string
  phone: string
  /** packages that can be used today */
  active: number
  packages: CustomerPackage[]
}

/** The account staff found before booking for it */
export interface CustomerMatch {
  user_id: number
  member_no: string
  name: string
  phone: string
  email?: string
}
