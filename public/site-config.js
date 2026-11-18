// Where the website and the backoffice live. In Docker, Caddy answers this file itself from WEB_URL / ADMIN_URL.
// Empty here: src/lib/site.ts then guesses (localhost: web :5173, admin :5175; elsewhere the "admin." subdomain).
window.__SITE__ = { web: "", admin: "" }
