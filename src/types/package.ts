export type SlipWay = "whatsapp" | "telegram"

/** What a package covers: the group classes of its sport, or one space (a private class) */
export type PackageCovers = "group_class" | "space"

/** One way to buy a package: "10 times 900,000", "1 month 700,000" */
export interface PackageOption {
  id: number
  kind: "times" | "months"
  /** visits (times) or months (months) */
  amount: number
  price: number
  /** a times option must be used within this many days of buying; 0 = no expiry */
  valid_days: number
  active: boolean
}

/** A package a branch sells (the team's and the public's view) */
export interface PackageItem {
  id: number
  sport_id: number
  sport_name: string
  name: string
  description: string
  covers: PackageCovers
  resource_id: number | null
  resource_name: string
  /** the weekly classes a group-class package covers; empty = every class of the sport */
  class_ids: number[]
  class_names: string[]
  active: boolean
  currency: string
  options: PackageOption[]
}

export interface PackageInput {
  sport_id: number
  name: string
  description: string
  covers: PackageCovers
  resource_id: number | null
  /** group classes only: the weekly classes it covers; empty = every class of the sport */
  class_ids: number[]
  active: boolean
  /** an option with an id is changed, one without is added, one left out is removed */
  options: {
    id?: number
    kind: "times" | "months"
    amount: number
    price: number
    valid_days: number
    active: boolean
  }[]
}

export type CustomerPackageStatus =
  "pending_payment" | "active" | "used_up" | "expired" | "cancelled"

/** A package a customer bought (names, price and visits are copied at the time of buying) */
export interface CustomerPackage {
  id: number
  /** "P-12": shown to people */
  code: string
  branch_id: number
  branch_name?: string
  branch_slug?: string
  customer_id: number
  customer_name?: string
  customer_phone?: string
  package_id: number
  sport_id: number
  name: string
  covers: PackageCovers
  resource_id: number | null
  resource_name: string
  class_ids: number[]
  class_names: string[]
  kind: "times" | "months"
  amount: number
  price: number
  currency: string
  times_left: number
  starts_on: string
  ends_on: string
  expires_on: string
  status: CustomerPackageStatus
  payment_status: "unpaid" | "paid"
  payment_method: string
  paid_at: string | null
  slip_sent_at: string | null
  slip_via: SlipWay | ""
  sold_by: "customer" | "staff"
  notes: string
  created_at: string
}

/** One line of a package's log: a visit used (-1), given back or added (+1), a month visit or an extension (0) */
export interface PackageVisit {
  id: number
  change: number
  booking_id: number | null
  note: string
  by_name?: string
  created_at: string
}

/** What a customer sends with "I paid": on WhatsApp (nothing to upload) or the slip picture (goes to the team's Telegram group) */
export interface SlipInput {
  via: SlipWay
  file?: Blob
}
