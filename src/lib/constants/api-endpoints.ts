// Every URL path the app calls. Services never write a path string: they take it from here.
// A function takes the ids that sit in the path (branch id first).

export const API_ENDPOINTS = {
  AUTH: {
    FORGOT_PASSWORD: "/auth/forgot-password",
    LOGIN: "/auth/login",
    ME: "/auth/me",
    CHANGE_PASSWORD: "/auth/me/password",
    EMAIL_CODE: "/auth/me/email/code",
    EMAIL_VERIFY: "/auth/me/email/verify",
    REGISTER: "/auth/register",
    RESET_PASSWORD: "/auth/reset-password",
    SOCIAL: (provider: string) => `/auth/social/${provider}`,
    SOCIAL_CONFIG: "/auth/social/config",
  },
  ME: {
    BOOKING: (bookingId: number) => `/me/bookings/${bookingId}`,
    BOOKINGS: "/me/bookings",
    BOOKINGS_CLAIM: "/me/bookings/claim",
    BOOKING_CANCEL: (bookingId: number) => `/me/bookings/${bookingId}/cancel`,
    BOOKING_PAY: (bookingId: number) => `/me/bookings/${bookingId}/pay`,
    BOOKING_PAYMENT: (bookingId: number) => `/me/bookings/${bookingId}/payment`,
    BOOKING_PAYMENT_ONE: (bookingId: number, paymentId: number) =>
      `/me/bookings/${bookingId}/payments/${paymentId}`,
    BOOKING_SLIP_SENT: (bookingId: number) =>
      `/me/bookings/${bookingId}/slip-sent`,
    BRANCHES: "/me/branches",
    PACKAGES: "/me/packages",
    PACKAGE_CANCEL: (packageId: number) => `/me/packages/${packageId}/cancel`,
    PACKAGE_PAY: (packageId: number) => `/me/packages/${packageId}/pay`,
    PACKAGE_PAYMENT: (packageId: number) => `/me/packages/${packageId}/payment`,
    PACKAGE_PAYMENT_ONE: (packageId: number, paymentId: number) =>
      `/me/packages/${packageId}/payments/${paymentId}`,
    PACKAGE_SLIP: (packageId: number) => `/me/packages/${packageId}/slip`,
    PACKAGE_VISITS: (packageId: number) => `/me/packages/${packageId}/visits`,
  },
  INVITATION: {
    ACCEPT: (token: string) =>
      `/invitations/${encodeURIComponent(token)}/accept`,
    ROOT: (token: string) => `/invitations/${encodeURIComponent(token)}`,
  },
  COMPANY: {
    BASE: "/company",
    BRANCHES: "/company/branches",
    BRANCH_CLOSE: (branchId: number) => `/company/branches/${branchId}/close`,
    BRANCH_REOPEN: (branchId: number) => `/company/branches/${branchId}/reopen`,
    CUSTOMERS: "/company/customers",
    INVITATION: (invitationId: number) =>
      `/company/invitations/${invitationId}`,
    INVITATIONS: "/company/invitations",
    INVITATION_RESEND: (invitationId: number) =>
      `/company/invitations/${invitationId}/resend`,
    REPORT: "/company/report",
    ROOT: "/company/",
    RULES: "/company/rules",
    TEAM: "/company/team",
    TEAM_LOOKUP: "/company/team/lookup",
    TEAM_MEMBER: (teamId: number) => `/company/team/${teamId}`,
    TRANSFER_OWNERSHIP: "/company/transfer-ownership",
    UPLOADS: "/company/uploads",
    USERS: "/company/users",
    USER_PASSWORD: (userId: number) => `/company/users/${userId}/password`,
    USER_STATUS: (userId: number) => `/company/users/${userId}/status`,
  },
  BRANCH: {
    ROOT: (branchId: number) => `/branches/${branchId}`,
    TEAM: (branchId: number) => `/branches/${branchId}/team`,
    TEAM_MEMBER: (branchId: number, userId: number) =>
      `/branches/${branchId}/team/${userId}`,
    AVAILABILITY: (branchId: number) => `/branches/${branchId}/availability`,
    BOOKING: (branchId: number, bookingId: number) =>
      `/branches/${branchId}/bookings/${bookingId}`,
    BOOKINGS: (branchId: number) => `/branches/${branchId}/bookings`,
    BOOKING_ARRIVED: (branchId: number, bookingId: number) =>
      `/branches/${branchId}/bookings/${bookingId}/arrived`,
    BOOKING_MOVE: (branchId: number, bookingId: number) =>
      `/branches/${branchId}/bookings/${bookingId}/move`,
    BOOKING_PAYMENT: (branchId: number, bookingId: number) =>
      `/branches/${branchId}/bookings/${bookingId}/payment`,
    BOOKING_PAYMENTS: (branchId: number, bookingId: number) =>
      `/branches/${branchId}/bookings/${bookingId}/payments`,
    BOOKING_STATUS: (branchId: number, bookingId: number) =>
      `/branches/${branchId}/bookings/${bookingId}/status`,
    CALENDAR: (branchId: number) => `/branches/${branchId}/calendar`,
    CLASS_SESSION: (branchId: number, classSessionId: number) =>
      `/branches/${branchId}/class-sessions/${classSessionId}`,
    CLASS_SESSIONS: (branchId: number) =>
      `/branches/${branchId}/class-sessions`,
    CLASS_TIMETABLE: (branchId: number, classTimetableId: number) =>
      `/branches/${branchId}/class-timetables/${classTimetableId}`,
    CLASS_TIMETABLES: (branchId: number) =>
      `/branches/${branchId}/class-timetables`,
    CLOSURE: (branchId: number, closureId: number) =>
      `/branches/${branchId}/closures/${closureId}`,
    CLOSURES: (branchId: number) => `/branches/${branchId}/closures`,
    COACH: (branchId: number, coachId: number) =>
      `/branches/${branchId}/coaches/${coachId}`,
    COACHES: (branchId: number) => `/branches/${branchId}/coaches`,
    CUSTOMERS: (branchId: number) => `/branches/${branchId}/customers`,
    /** customers who bought a package here (the Membership tab) */
    MEMBERS: (branchId: number) => `/branches/${branchId}/members`,
    CUSTOMERS_FIND: (branchId: number) =>
      `/branches/${branchId}/customers/find`,
    CUSTOMER_PACKAGES: (branchId: number) =>
      `/branches/${branchId}/customer-packages`,
    CUSTOMER_PACKAGE_ADJUST: (branchId: number, customerPackageId: number) =>
      `/branches/${branchId}/customer-packages/${customerPackageId}/adjust`,
    CUSTOMER_PACKAGE_CANCEL: (branchId: number, customerPackageId: number) =>
      `/branches/${branchId}/customer-packages/${customerPackageId}/cancel`,
    CUSTOMER_PACKAGE_PAID: (branchId: number, customerPackageId: number) =>
      `/branches/${branchId}/customer-packages/${customerPackageId}/paid`,
    CUSTOMER_PACKAGE_VISITS: (branchId: number, customerPackageId: number) =>
      `/branches/${branchId}/customer-packages/${customerPackageId}/visits`,
    EVENT: (branchId: number, eventId: number) =>
      `/branches/${branchId}/events/${eventId}`,
    EVENTS: (branchId: number) => `/branches/${branchId}/events`,
    EVENT_COPY: (branchId: number, eventId: number) =>
      `/branches/${branchId}/events/${eventId}/copy`,
    EVENT_PAY: (branchId: number) => `/branches/${branchId}/event-pay`,
    EVENT_PRICES: (branchId: number, eventId: number) =>
      `/branches/${branchId}/events/${eventId}/prices`,
    OPENING_HOURS: (branchId: number, owner: string, id: number) =>
      `/branches/${branchId}/opening-hours/${owner}/${id}`,
    PACKAGE: (branchId: number, packageId: number) =>
      `/branches/${branchId}/packages/${packageId}`,
    PACKAGES: (branchId: number) => `/branches/${branchId}/packages`,
    PAYMENTS_ATTENTION: (branchId: number) =>
      `/branches/${branchId}/payments/attention`,
    PAYMENT_REFUND: (branchId: number, paymentId: number) =>
      `/branches/${branchId}/payments/${paymentId}/refund`,
    PAYMENT_SETTINGS: (branchId: number) =>
      `/branches/${branchId}/payment-settings`,
    PRICES: (branchId: number, owner: string, id: number) =>
      `/branches/${branchId}/prices/${owner}/${id}`,
    PUBLISH: (branchId: number) => `/branches/${branchId}/publish`,
    REPORT: (branchId: number, kind: string) =>
      `/branches/${branchId}/reports/${kind}`,
    REPORTS_CASH_UP: (branchId: number) =>
      `/branches/${branchId}/reports/cash-up`,
    REPORTS_EVENT_BOOKINGS: (branchId: number) =>
      `/branches/${branchId}/reports/event-bookings`,
    REPORTS_TABLE_BOOKINGS: (branchId: number) =>
      `/branches/${branchId}/reports/table-bookings`,
    REPORTS_UNPAID: (branchId: number) =>
      `/branches/${branchId}/reports/unpaid`,
    RESOURCE: (branchId: number, resourceId: number) =>
      `/branches/${branchId}/resources/${resourceId}`,
    RESOURCES: (branchId: number) => `/branches/${branchId}/resources`,
    RULES: (branchId: number) => `/branches/${branchId}/rules`,
    RULES_COMPANY: (branchId: number) => `/branches/${branchId}/rules/company`,
    RULES_EFFECTIVE: (branchId: number) =>
      `/branches/${branchId}/rules/effective`,
    RULE: (branchId: number, scope: string, id: number) =>
      `/branches/${branchId}/rules/${scope}/${id}`,
    SETTINGS: (branchId: number) => `/branches/${branchId}/settings`,
    SPORT: (branchId: number, sportId: number) =>
      `/branches/${branchId}/sports/${sportId}`,
    SPORTS: (branchId: number) => `/branches/${branchId}/sports`,
    SPORT_PLAN: (branchId: number, sportId: number) =>
      `/branches/${branchId}/sports/${sportId}/plan`,
    TABLE_AVAILABILITY: (branchId: number) =>
      `/branches/${branchId}/table-availability`,
    TABLE_SETTINGS: (branchId: number) =>
      `/branches/${branchId}/table-settings`,
    TELEGRAM: (branchId: number) => `/branches/${branchId}/telegram`,
    TELEGRAM_FIND_GROUPS: (branchId: number) =>
      `/branches/${branchId}/telegram/find-groups`,
    TELEGRAM_TEST: (branchId: number) => `/branches/${branchId}/telegram/test`,
    UNPUBLISH: (branchId: number) => `/branches/${branchId}/unpublish`,
    WALK_INS: (branchId: number) => `/branches/${branchId}/walk-ins`,
  },
  MEDIA: {
    // `scope` is API_ENDPOINTS.COMPANY.BASE or API_ENDPOINTS.BRANCH.ROOT(id): one library per scope
    UPLOADS: (scope: string) => `${scope}/uploads`,
  },
  PUBLIC_HOME: {
    BRANCHES: "/public/branches",
    COMPANY: "/public/company",
  },
  PUBLIC: {
    AVAILABILITY: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/availability`,
    COACH_AVAILABILITY: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/coach-availability`,
    BOOKING: (slug: string, token: string) =>
      `/public/branches/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(token)}`,
    BOOKINGS: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/bookings`,
    BOOKINGS_FIND: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/bookings/find`,
    PHONE_CHECK: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/phone-check`,
    BOOKINGS_FIND_CANCEL: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/bookings/find/cancel`,
    BOOKING_CANCEL: (slug: string, token: string) =>
      `/public/branches/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(token)}/cancel`,
    BOOKING_PAY: (slug: string, token: string) =>
      `/public/branches/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(token)}/pay`,
    BOOKING_PAYMENT: (slug: string, token: string) =>
      `/public/branches/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(token)}/payment`,
    BOOKING_PAYMENT_ONE: (slug: string, token: string, paymentId: number) =>
      `/public/branches/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(token)}/payments/${paymentId}`,
    BOOKING_SLIP_SENT: (slug: string, token: string) =>
      `/public/branches/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(token)}/slip-sent`,
    CLASS_SESSIONS: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/class-sessions`,
    COACHES: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/coaches`,
    EVENT: (slug: string, eventId: number) =>
      `/public/branches/${encodeURIComponent(slug)}/events/${eventId}`,
    EVENTS: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/events`,
    EVENT_BOOKINGS: (slug: string, eventId: number) =>
      `/public/branches/${encodeURIComponent(slug)}/events/${eventId}/bookings`,
    EVENT_PAY: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/event-pay`,
    FLOOR_PLANS: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/floor-plans`,
    PACKAGES: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/packages`,
    PACKAGE_BUY: (slug: string, packageId: number) =>
      `/public/branches/${encodeURIComponent(slug)}/packages/${packageId}/buy`,
    PAYMENT_OPTIONS: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/payment-options`,
    RESOURCES: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/resources`,
    ROOT: (slug: string) => `/public/branches/${encodeURIComponent(slug)}/`,
    SPORTS: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/sports`,
    TABLE_AVAILABILITY: (slug: string) =>
      `/public/branches/${encodeURIComponent(slug)}/table-availability`,
  },
} as const
