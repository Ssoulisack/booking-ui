import type { BookingMode } from "@/lib/api/types"

// Choices offered in the company and branch settings

export const TIMEZONES = [
  "Asia/Vientiane",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Phnom_Penh",
  "Asia/Yangon",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Manila",
  "Asia/Jakarta",
]
export const CURRENCIES = [
  "LAK",
  "THB",
  "USD",
  "VND",
  "KHR",
  "MMK",
  "SGD",
  "MYR",
  "PHP",
  "IDR",
  "CNY",
  "EUR",
]
export const LANGUAGES = ["en", "lo", "th"] as const
export const SOCIAL = [
  "facebook",
  "whatsapp",
  "line",
  "instagram",
  "tiktok",
  "website",
] as const
export const MODES: BookingMode[] = ["both", "account", "guest"]

/** A list with the current value first when it is not one of the usual ones */
export const withCurrent = (list: string[], current: string) =>
  current && !list.includes(current) ? [current, ...list] : list

/** Social links without the empty ones, as the API stores them */
export const filledLinks = (links: Record<string, string> | null) =>
  Object.fromEntries(
    Object.entries(links ?? {}).filter(([, url]) => url.trim() !== ""),
  )
