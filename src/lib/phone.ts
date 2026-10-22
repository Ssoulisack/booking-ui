// Same rule as the backend (domain.NormalizePhone): an account phone is a Lao mobile written
// 20xxxxxxxx (20 and 8 digits). Habits such as "020 5555 1234" or "+856 20 5555 1234" are accepted
// and turned into that format.

const LAO_MOBILE = /^20\d{8}$/

/** "020 5555 1234" → "2055551234"; null when it is not a 20 + 8 digit Lao mobile */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").replace(/^856/, "").replace(/^0/, "")
  return LAO_MOBILE.test(digits) ? digits : null
}

export function isLaoPhone(raw: string): boolean {
  return normalizePhone(raw) !== null
}

/** Phones are shown the way they are stored and typed: 2055551234 */
export function displayPhone(phone: string): string {
  return normalizePhone(phone) ?? phone
}

/** A link that dials from any phone: 2055551234 → tel:+8562055551234; other numbers as typed */
export function telHref(phone: string): string {
  const lao = normalizePhone(phone)
  return `tel:${lao ? `+856${lao}` : phone.replace(/[^\d+]/g, "")}`
}
