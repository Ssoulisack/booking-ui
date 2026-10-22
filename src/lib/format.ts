import { addDays } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

// Times are always shown in the business's time zone, whatever the phone is set to

/** 150000 LAK → "₭150,000" */
export function money(amount: number, currency: string, locale = "en") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString(locale)} ${currency}`
  }
}

/** "18:00" */
export const timeIn = (iso: string, tz: string) =>
  formatInTimeZone(iso, tz, "HH:mm")

/** "Thu 23 Oct" */
export const dayIn = (iso: string, tz: string) =>
  formatInTimeZone(iso, tz, "EEE d MMM")

/** "Thursday 23 October 2026" */
export const longDayIn = (iso: string, tz: string) =>
  formatInTimeZone(iso, tz, "EEEE d MMMM yyyy")

/** Today's date (YYYY-MM-DD) in the business time zone */
export const todayIn = (tz: string, now = new Date()) =>
  formatInTimeZone(now, tz, "yyyy-MM-dd")

/** The next `count` dates (YYYY-MM-DD) in the business time zone, today first */
export function nextDays(
  tz: string,
  count: number,
  now = new Date(),
): string[] {
  const start = fromZonedTime(`${todayIn(tz, now)}T12:00:00`, tz)
  return Array.from({ length: count }, (_, i) =>
    formatInTimeZone(addDays(start, i), tz, "yyyy-MM-dd"),
  )
}

/** A YYYY-MM-DD date as a moment at midday in the business time zone (safe for labels) */
export const middayOf = (ymd: string, tz: string) =>
  fromZonedTime(`${ymd}T12:00:00`, tz).toISOString()

/** 90 → "1 h 30 min", 60 → "1 h", 30 → "30 min" */
export function duration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} h ${m} min`
  return h ? `${h} h` : `${m} min`
}
