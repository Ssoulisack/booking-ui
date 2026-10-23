/**
 * The branch this person came from (a scanned QR code or a link, or picked on the home): kept for
 * the browser tab so My bookings and My account can lead back to it instead of the home.
 */
const KEY = "booking.origin"

export interface Origin {
  slug: string
  name: string
}

export function rememberOrigin(origin: Origin) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(origin))
  } catch {
    // private window or blocked storage: back leads to the home
  }
}

export function readOrigin(): Origin | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    const v = raw ? (JSON.parse(raw) as Partial<Origin>) : null
    return v?.slug && v.name ? { slug: v.slug, name: v.name } : null
  } catch {
    return null
  }
}
