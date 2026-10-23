import { slugify } from "./api"

/**
 * The name a copy of a branch starts with: NONGBONE → NONGBONE-COPY; if that is taken (or the
 * source is itself a copy) NONGBONE-COPY-1, -2, -3 … counted from the original's name.
 */
export function copyName(
  source: string,
  existing: Array<{ name: string; slug: string }>,
): string {
  const root = source.replace(/-COPY(-\d+)?$/i, "")
  const names = new Set(existing.map((b) => b.name.toLowerCase()))
  const slugs = new Set(existing.map((b) => b.slug))
  const free = (name: string) =>
    !names.has(name.toLowerCase()) && !slugs.has(slugify(name))
  const first = `${root}-COPY`
  if (free(first)) return first
  for (let n = 1; ; n++) {
    const next = `${first}-${n}`
    if (free(next)) return next
  }
}
