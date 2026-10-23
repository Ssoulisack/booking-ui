/**
 * The page a customer came from before My bookings / My account, kept for the browser tab: the
 * list of all branches, or a branch page. The top-left arrow there leads back to it, so All
 * branches → NONGBONE → My bookings goes back to NONGBONE, and All branches → My bookings goes
 * back to All branches. (Checkout and booking pages count as their branch.)
 */
const PAGE = "booking.page-before"
const NAMES = "booking.branch-names"

export type Back = { to: string; name?: string }

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // private window or blocked storage: back leads to all branches
  }
}

/** Called on every page change: remembers the home or branch page, and leaves the rest alone */
export function trackPage(pathname: string) {
  if (pathname === "/") {
    write(PAGE, { to: "/" } satisfies Back)
    return
  }
  const branch = /^\/b\/([^/]+)/.exec(pathname)
  if (branch) write(PAGE, { to: `/b/${branch[1]}`, slug: branch[1] })
}

/** A branch's name, for the back arrow's label */
export function rememberBranchName(slug: string, name: string) {
  write(NAMES, { ...(read<Record<string, string>>(NAMES) ?? {}), [slug]: name })
}

/** Where the arrow goes: the page before, or all branches when there was none */
export function readBack(): Back | null {
  const page = read<{ to: string; slug?: string }>(PAGE)
  if (!page) return null
  if (!page.slug) return { to: page.to }
  const name = read<Record<string, string>>(NAMES)?.[page.slug]
  return { to: page.to, name: name ?? page.slug }
}
