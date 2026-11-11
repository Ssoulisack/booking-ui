// The name of each path segment in the breadcrumb trail, as a translation key.
// A segment that is not listed (an id) shows as "Details".

/** /dashboard/:id/… */
export const DASHBOARD_CRUMBS: Record<string, string> = {
  calendar: "nav.calendar",
  bookings: "nav.bookings",
  customers: "nav.customers",
  employees: "nav.employees",
  packages: "nav.packages",
  "cash-up": "nav.cashUp",
  setup: "nav.setup",
  reports: "nav.reports",
  share: "nav.share",
  media: "nav.media",
  telegram: "nav.telegram",
  settings: "nav.branchSettings",
  sports: "setup.tabs.sports",
  spaces: "setup.tabs.spaces",
  coaches: "setup.tabs.coaches",
  classes: "setup.tabs.classes",
  payments: "setup.tabs.payments",
  events: "setup.tabs.events",
  closures: "setup.tabs.closures",
  rules: "setup.tabs.rules",
  "floor-plan": "setup.tabs.floor-plan",
  hours: "setup.tabs.hours",
  "table-settings": "setup.tabs.table-settings",
}

/** /company/… */
export const COMPANY_CRUMBS: Record<string, string> = {
  branches: "nav.branches",
  team: "nav.team",
  invite: "breadcrumb.invite",
  customers: "nav.customers",
  reports: "nav.reports",
  users: "nav.users",
  rules: "nav.bookingRules",
  media: "nav.media",
  share: "nav.share",
  settings: "nav.companySettings",
}
