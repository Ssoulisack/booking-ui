/**
 * The frontend is built twice: the customer website ("web") and the backoffice ("admin", own subdomain and port).
 * `vite --mode admin` / `vite build --mode admin` makes the backoffice; every other mode is the website.
 *
 * Where the other site lives is read at run time, so one image works in every environment:
 *   1. /site-config.js (Caddy fills it from WEB_URL / ADMIN_URL), else
 *   2. VITE_WEB_URL / VITE_ADMIN_URL from the build, else
 *   3. a guess: on localhost the dev ports (web :5173, admin :5175); test.example.com ↔ admin-test.example.com;
 *      example.com ↔ admin.example.com.
 */
export const IS_ADMIN = import.meta.env.MODE === "admin"

export const WEB_DEV_PORT = 5173
export const ADMIN_DEV_PORT = 5175

declare global {
  interface Window {
    __SITE__?: { web?: string; admin?: string }
  }
}

const clean = (url: string | undefined) =>
  url && /^https?:\/\//.test(url) ? url.replace(/\/+$/, "") : undefined

function guess(target: "web" | "admin"): string {
  const { protocol, hostname, port } = window.location
  const local = hostname === "localhost" || hostname === "127.0.0.1"
  if (local) {
    const to = target === "admin" ? ADMIN_DEV_PORT : WEB_DEV_PORT
    return `${protocol}//${hostname}:${to}`
  }
  // the website's host: admin.example.com → example.com, admin-test.example.com → test.example.com
  const web = hostname.replace(/^admin\./, "").replace(/^admin-/, "")
  let host = web
  if (target === "admin") {
    // a subdomain gets "admin-" in front (test.example.com → admin-test.example.com: Cloudflare's free certificate
    // covers one level only); a bare domain gets "admin." (example.com → admin.example.com)
    host = web.split(".").length > 2 ? `admin-${web}` : `admin.${web}`
  }
  return `${protocol}//${host}${port ? `:${port}` : ""}`
}

function origin(target: "web" | "admin"): string {
  const own = IS_ADMIN ? "admin" : "web"
  if (target === own) return window.location.origin
  return (
    clean(window.__SITE__?.[target]) ??
    clean(
      target === "admin"
        ? import.meta.env.VITE_ADMIN_URL
        : import.meta.env.VITE_WEB_URL,
    ) ??
    guess(target)
  )
}

/** Full address of a page on the customer website, e.g. webUrlOf("/b/court-1") */
export const webUrlOf = (path = "/") => origin("web") + path

/** Full address of a page in the backoffice, e.g. adminUrlOf("/company") */
export const adminUrlOf = (path = "/") => origin("admin") + path

/** Paths that belong to the backoffice */
export const isAdminPath = (path: string) =>
  /^\/(company|dashboard|invite)(\/|$|\?)/.test(path)
