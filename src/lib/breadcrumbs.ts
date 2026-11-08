export interface Crumb {
  label: string
  to: string
}

/** The home crumb, then one crumb per path segment after `base`, named by `name` */
export function crumbsFor(
  home: Crumb,
  base: string,
  pathname: string,
  name: (segment: string) => string,
): Crumb[] {
  const rest = pathname.slice(base.length).split("/").filter(Boolean)
  const crumbs = [home]
  let to = base
  for (const segment of rest) {
    to = `${to}/${segment}`
    crumbs.push({ label: name(segment), to })
  }
  return crumbs
}
