import { BrandHome } from "./BrandHome"

/**
 * "/" — the company's brand home, for everyone. The team works in the backoffice (its own subdomain, see lib/site.ts),
 * reached from the user menu.
 */
export function Home() {
  return <BrandHome />
}
