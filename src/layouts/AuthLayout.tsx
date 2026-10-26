import { CalendarCheckIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, Outlet } from "react-router"

/** Login, register and password pages: full width on phones, a centred card from tablets up */
export function AuthLayout() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex h-14 items-center px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <CalendarCheckIcon className="size-5 text-primary" />
          {t("app.name")}
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-4 pb-10 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm rounded-xl bg-background p-5 shadow-sm ring-1 ring-border sm:p-8">
          <Outlet />
        </div>
      </main>
      <footer className="flex justify-center gap-4 px-4 pb-6 text-xs text-muted-foreground">
        <Link to="/privacy" className="underline-offset-4 hover:underline">
          {t("legal.privacy.title")}
        </Link>
        <Link to="/data-deletion" className="underline-offset-4 hover:underline">
          {t("legal.deletion.title")}
        </Link>
      </footer>
    </div>
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
    <div className="mb-6 space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
