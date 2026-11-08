/** How customers pay the branch for event tables */
export interface PayInfo {
  whatsapp: string
  qr_key: string
  qr_url?: string
  note: string
  /** the account customers transfer to */
  account_name: string
  account_number: string
  /** the branch's own way to pay (QR, transfer, WhatsApp) is on */
  transfer_enabled: boolean
  /** the ways a customer can send the payment slip: on WhatsApp, or uploaded here and sent to the team's Telegram group */
  slip_whatsapp: boolean
  slip_telegram: boolean
  /** the branch has a Telegram bot and group connected, so the Telegram way can be turned on (read only) */
  telegram_ready?: boolean
}

/** Online payment on or off for the branch, and whether the server has a gateway at all */
export interface PaymentSettings {
  online_enabled: boolean
  /** sport branches: online payment is offered for bookings (packages are separate) */
  online_bookings: boolean
  /** sport branches: online payment is offered when buying a package */
  online_packages: boolean
  gateway_available: boolean
  /** how long a customer has to pay once they chose a bank */
  charge_minutes: number
}

/** A gateway the customer can pay through, with its ways to pay (a bank's QR, a payment page) */
export interface PaymentOption {
  provider: string
  label: string
  methods: Array<{ key: string; label: string }>
}

export type OnlinePaymentStatus =
  | "pending"
  | "paid"
  | "expired"
  | "failed"
  | "mismatch"
  | "refund_due"
  | "disputed"
  | "refund_requested"
  | "refunded"

/** One try to pay a booking online: what to scan or open, and where it stands */
export interface OnlinePayment {
  id: number
  provider: string
  method: string
  status: OnlinePaymentStatus
  amount: number
  currency: string
  qr_code?: string
  deeplink?: string
  redirect_url?: string
  expires_at: string
}

/** A payment as the team sees it (every try the customer made is its own payment) */
export interface StaffPayment extends OnlinePayment {
  booking_id: number
  order_no: string
  provider_ref: string
  paid_at?: string
  refund_ref?: string
  note?: string
  created_at: string
}

/** How a customer pays the branch outside the system (read from any device) */
export interface PublicPayInfo {
  whatsapp: string
  qr_url?: string
  note: string
  account_name: string
  account_number: string
  transfer_enabled: boolean
  /** the slip ways that work right now (WhatsApp: a number is set; Telegram: connected) */
  slip_whatsapp: boolean
  slip_telegram: boolean
}

/** Who pays online: a guest by the booking's private link, a logged-in customer for a booking or a package */
export type PayWho =
  { token: string } | { bookingId: number } | { packageId: number }
