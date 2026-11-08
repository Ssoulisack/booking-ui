/**
 * The link part of a name, like the backend makes it: "Smash Tennis!" → "smash-tennis".
 * Lao or Thai names give "" — the backend then makes a link itself.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "")
}
