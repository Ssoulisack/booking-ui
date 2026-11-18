import { ArrowLeftIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, Outlet } from "react-router"

import { LanguageToggle } from "@/components/global/LanguageToggle"

/** /account/profile in the backoffice: the team's own name, email and password, with a way back to work */
export function BackofficeProfileLayout() {
  const { t } = useTranslation()
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Link
            to="/"
            className="mr-auto flex h-11 min-w-0 items-center gap-2 rounded-lg px-2 font-semibold hover:bg-muted"
          >
            <ArrowLeftIcon className="size-5 shrink-0" />
            <span className="truncate">{t("backoffice.back")}</span>
          </Link>
          <LanguageToggle />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
