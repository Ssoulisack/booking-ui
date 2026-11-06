// The setup tabs: what can be booked at a sport place, or at a restaurant

const SPORT_TABS = [
  "sports",
  "spaces",
  "coaches",
  "classes",
  "packages",
  "closures",
  "rules",
] as const

// a restaurant books tables: areas and their floor plans, one set of hours for the whole place
const RESTAURANT_TABS = [
  "floor-plan",
  "hours",
  "table-settings",
  "events",
  "closures",
  "rules",
] as const

export function setupTabs(type: string | undefined) {
  return type === "restaurant" ? RESTAURANT_TABS : SPORT_TABS
}
