/** The link if it is a plain web address (http / https), otherwise undefined: never javascript: etc. */
export function webUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined
  try {
    const u = new URL(raw)
    return u.protocol === "http:" || u.protocol === "https:"
      ? u.href
      : undefined
  } catch {
    return undefined
  }
}
