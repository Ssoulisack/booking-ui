/**
 * After a deploy, a tab that still runs the previous build asks for a page file by its old name (the names carry a
 * hash), which no longer exists: the page cannot open. Reloading gets the new build. It is done once per tab and
 * minute, so a file that is really broken shows the crash screen instead of reloading for ever.
 */
const KEY = "stale-build-reload"

function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    // storage blocked (private mode): no guard, but one reload of a stale tab is still the right answer
  }
  window.location.reload()
  return true
}

/** A failed import() of a page: "Failed to fetch dynamically imported module", "Importing a module script failed", ... */
export function isStaleBuildError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "")
  return /dynamically imported module|module script failed|error loading dynamically imported|Unable to preload CSS/i.test(
    msg,
  )
}

/** Reloads when the error is a page file of an older build; false: show the crash screen */
export function reloadIfStaleBuild(error: unknown): boolean {
  return isStaleBuildError(error) && reloadOnce()
}

/** Vite reports a failed preload of a page's files before React Router sees it */
export function watchStaleBuild() {
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadOnce()) event.preventDefault()
  })
}
