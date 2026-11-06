import i18n from "@/i18n"
import { addDays } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

// Times are always shown in the business's time zone, whatever the phone is set to

/** 150000 LAK → "₭150,000" */
/**
 * A Lao phone number as people write it, without the country code or the leading 0: "+8562055557040" and
 * "020 5555 7040" both give "2055557040". "-" and anything that is not a number are left as they are.
 */
export function shortPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 8) return phone
  const local = digits.startsWith("856") ? digits.slice(3) : digits
  return local.replace(/^0+/, "")
}

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

/** "05-11-2026 17:58:07": day-month-year hour:minute:second, in the branch time zone (reports) */
export function stampIn(iso: string, tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  )
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`
}

/** "18:00" */
export const timeIn = (iso: string, tz: string) =>
  formatInTimeZone(iso, tz, "HH:mm")

/**
 * The page language for dates: English keeps the fixed look ("Thu 23 Oct"); Lao and Thai use the browser's own
 * weekday and month names (always the Gregorian year, not the Buddhist one Thai uses by default)
 */
const localeTag = () => {
  const l = i18n.resolvedLanguage ?? i18n.language
  return l === "lo"
    ? "lo-LA-u-ca-gregory"
    : l === "th"
      ? "th-TH-u-ca-gregory"
      : null
}

/** "Thu 23 Oct" (in Lao and Thai: the same in their words) */
export const dayIn = (iso: string, tz: string) => {
  const tag = localeTag()
  return tag
    ? new Intl.DateTimeFormat(tag, {
        timeZone: tz,
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(iso))
    : formatInTimeZone(iso, tz, "EEE d MMM")
}

/** "Thursday 23 October 2026" (in Lao and Thai: the same in their words) */
export const longDayIn = (iso: string, tz: string) => {
  const tag = localeTag()
  return tag
    ? new Intl.DateTimeFormat(tag, {
        timeZone: tz,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(iso))
    : formatInTimeZone(iso, tz, "EEEE d MMMM yyyy")
}

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
