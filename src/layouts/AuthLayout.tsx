import { CalendarCheckIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, Outlet } from "react-router"

import { usePublicCompany } from "@/features/places/api"
import { BrandMark } from "@/features/public/BrandMark"
import { CustomerTheme } from "@/features/public/CustomerTheme"
import { ThemeToggle } from "@/features/public/ThemeToggle"
import { LanguageToggle } from "@/components/LanguageToggle"

/** The company's name (and logo) at the top left of the customer-themed plain pages */
export function CompanyLink() {
  const { t } = useTranslation()
  const company = usePublicCompany().data
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5 font-semibold">
      {company?.logo_url ? (
        <BrandMark
          name={company.name}
          logo={company.logo_url}
          className="size-8"
        />
      ) : (
        <CalendarCheckIcon className="size-5 shrink-0 text-[var(--primary-ink)]" />
      )}
      <span className="truncate display-tight text-lg">
        {company?.name ?? t("app.name")}
      </span>
    </Link>
  )
}

/** Login, register and password pages: full width on phones, a centred card from tablets up */
export function AuthLayout() {
  const { t } = useTranslation()
  return (
    <CustomerTheme className="flex flex-col">
      <header className="pub-rainbow sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <div className="mr-auto min-w-0">
            <CompanyLink />
          </div>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-10 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm candy-card bg-card p-5 sm:p-8">
          <Outlet />
        </div>
      </main>
      <footer className="flex justify-center gap-4 px-4 pb-6 text-xs text-muted-foreground">
        <Link to="/privacy" className="underline-offset-4 hover:underline">
          {t("legal.privacy.title")}
        </Link>
        <Link
          to="/data-deletion"
          className="underline-offset-4 hover:underline"
        >
          {t("legal.deletion.title")}
        </Link>
      </footer>
    </CustomerTheme>
  )
}

export function AuthHeading({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-6 space-y-2">
      <h1 className="display-tight text-4xl">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
