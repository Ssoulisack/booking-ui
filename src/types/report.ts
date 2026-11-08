import type { BookingStatus, PaymentMethod } from "@/types/booking"
import type { PageMeta } from "@/types/common"

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

/** One booking of the table or event report; a cell with nothing to show is "-" */
export interface BookingReportRow {
  index: number
  table_number: string
  book_code: string
  fullname: string
  phone: string
  email: string
  customer_type: "guest" | "customer" | "staff" | "admin"
  book_time: string
  status: BookingStatus
}

export interface TableReport {
  cards: {
    date: string
    total_tables: number
    tables_taken: number
    available: number
  }
  items: BookingReportRow[]
  meta: PageMeta
}

export interface EventReportRow extends BookingReportRow {
  payment_status: string
  bank: string
  amount: number
  currency: string
}

export interface EventReport {
  totals: Array<{
    currency: string
    success_amount: number
    cancelled_amount: number
  }>
  items: EventReportRow[]
  meta: PageMeta
}

/** One line of the transactions table: money received, or a package visit used (no money) */
export interface TransactionRow {
  paid_at: string
  kind: "booking" | "package" | "visit"
  code: string
  name: string
  phone: string
  /** the sport of a booking, or the package and its option */
  what: string
  /** a package visit: which package paid it ("Package A · 10 times") and its code (P-0003) */
  package: string
  package_code: string
  method: PaymentMethod | "online"
  amount: number
  currency: string
  paid_by: string
  /** cancelled afterwards (the money was received) */
  cancelled: boolean
}

export interface Transactions {
  from: string
  to: string
  rows: TransactionRow[]
  totals: Money[]
  by_kind: Array<{
    kind: TransactionRow["kind"]
    currency: string
    count: number
    amount: number
  }>
  by_method: Array<{
    method: string
    currency: string
    count: number
    amount: number
  }>
}
