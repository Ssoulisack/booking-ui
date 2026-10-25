import {
  BarChart3Icon,
  Building2Icon,
  CalendarRangeIcon,
  ImagesIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, Outlet, useLocation } from "react-router"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ShareBooking } from "@/features/dashboard/ShareBooking"
import { PageHeader, Panel } from "@/features/dashboard/ui"
import { money } from "@/lib/format"
import { AppShell } from "@/layouts/AppShell"
import { crumbsFor } from "@/layouts/crumbs"

import { useBranches, useCompany, useCompanyReport } from "./api"
import { thisMonth } from "./period"
import { paginate } from "./paging"
import { Pager, StatusBadge } from "./ui"

// the name of each /company/… path segment in the breadcrumbs
const COMPANY_CRUMBS: Record<string, string> = {
  branches: "nav.branches",
  team: "nav.team",
  invite: "breadcrumb.invite",
  customers: "nav.customers",
  reports: "nav.reports",
  users: "nav.users",
  rules: "nav.bookingRules",
  media: "nav.media",
  settings: "nav.companySettings",
}

// the overview shows fewer branch cards per page than the Branches list
const OVERVIEW_PAGE = 10

/** /company — the owner's and admins' area (see RequireCompany) */
export function CompanyLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const company = useCompany()
  const nav = [
    {
      to: "/company",
      label: t("nav.overview"),
      icon: LayoutDashboardIcon,
      end: true,
    },
    { to: "/company/branches", label: t("nav.branches"), icon: Building2Icon },
    { to: "/company/team", label: t("nav.team"), icon: UsersIcon },
    {
      to: "/company/customers",
      label: t("nav.customers"),
      icon: UsersRoundIcon,
    },
    { to: "/company/reports", label: t("nav.reports"), icon: BarChart3Icon },
    { to: "/company/users", label: t("nav.users"), icon: KeyRoundIcon },
    {
      to: "/company/rules",
      label: t("nav.bookingRules"),
      icon: CalendarRangeIcon,
    },
    { to: "/company/media", label: t("nav.media"), icon: ImagesIcon },
    {
      to: "/company/settings",
      label: t("nav.companySettings"),
      icon: SettingsIcon,
    },
  ]
  const crumbs = crumbsFor(
    { label: company.data?.name || t("nav.company"), to: "/company" },
    "/company",
    pathname,
    (segment) => t(COMPANY_CRUMBS[segment] ?? "breadcrumb.details"),
  )
  return (
    <AppShell
      nav={nav}
      area="company"
      areaSwitch
      crumbs={crumbs}
      context={
        <span className="truncate px-2 font-medium">
          {company.data?.name ?? ""}
        </span>
      }
    >
      <Outlet />
    </AppShell>
  )
}

/** /company — this month at every branch, the home page link and QR, and the branches */
export function CompanyHome() {
  const { t } = useTranslation()
  const company = useCompany()
  const branches = useBranches()
  const period = thisMonth(company.data?.timezone ?? "Asia/Vientiane")
  const report = useCompanyReport(period)
  const [page, setPage] = useState(1)
  const cards = paginate(branches.data ?? [], page, OVERVIEW_PAGE)

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.data?.name ?? t("nav.company")}
        lead={t("company.homeLead")}
        actions={
          <Button asChild className="h-11 lg:h-9">
            <Link to="/company/branches?new=1">{t("company.newBranch")}</Link>
          </Button>
        }
      />
      <Panel title={t("company.thisMonth")}>
        {report.isPending ? (
          <Skeleton className="h-20" />
        ) : report.isError ? (
          <ErrorAlert error={report.error} />
        ) : (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Figure
              label={t("company.bookings")}
              value={String(report.data.bookings)}
            />
            {(report.data.totals.length > 0
              ? report.data.totals
              : [
                  {
                    currency: company.data?.currency ?? "LAK",
                    booked_value: 0,
                    paid: 0,
                    outstanding: 0,
                  },
                ]
            ).flatMap((m) => [
              <Figure
                key={`${m.currency}-b`}
                label={t("company.bookedValue")}
                value={money(m.booked_value, m.currency)}
              />,
              <Figure
                key={`${m.currency}-p`}
                label={t("company.paid")}
                value={money(m.paid, m.currency)}
              />,
              <Figure
                key={`${m.currency}-o`}
                label={t("company.outstanding")}
                value={money(m.outstanding, m.currency)}
              />,
            ])}
          </dl>
        )}
      </Panel>
      <Panel
        title={t("company.homeLinkTitle")}
        lead={t("company.homeLinkLead")}
      >
        <ShareBooking
          url={`${window.location.origin}/`}
          name={company.data?.name ?? ""}
        />
      </Panel>
      <Panel title={t("nav.branches")}>
        {branches.isPending ? (
          <Skeleton className="h-32" />
        ) : branches.isError ? (
          <ErrorAlert error={branches.error} />
        ) : branches.data.length === 0 ? (
          <p className="text-muted-foreground">{t("company.noBranches")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {cards.items.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/dashboard/${b.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-xl border px-4 py-3 hover:bg-muted/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{b.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {b.address || `/b/${b.slug}`}
                    </span>
                  </span>
                  <StatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Pager meta={cards.meta} page={cards.page} onPage={setPage} />
        </div>
      </Panel>
    </div>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
