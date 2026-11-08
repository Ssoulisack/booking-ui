import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { CompanyLink } from "@/components/layout/AuthLayout"
import { CustomerTheme } from "@/components/public/booking/CustomerTheme"
import { ThemeToggle } from "@/components/public/booking/ThemeToggle"
import { LanguageToggle } from "@/components/global/LanguageToggle"

/** Address for privacy and deletion requests; set VITE_CONTACT_EMAIL on the host */
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL as string | undefined

type Section = { h: string; p: string[] }

/** /privacy and /data-deletion: plain public pages (no login) that Facebook and Google ask for */
export function LegalPage({ page }: { page: "privacy" | "deletion" }) {
  const { t } = useTranslation()
  const sections = t(`legal.${page}.sections`, {
    returnObjects: true,
    email: CONTACT_EMAIL ?? t("legal.noEmail"),
  }) as Section[]

  return (
    <CustomerTheme>
      <header className="pub-rainbow sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          <div className="mr-auto min-w-0">
            <CompanyLink />
          </div>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pt-2 pb-12">
        <article className="space-y-6 candy-card bg-card p-5 sm:p-8">
          <div className="space-y-1">
            <h1 className="display-tight text-4xl">
              {t(`legal.${page}.title`)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("legal.updated")}
            </p>
          </div>
          {sections.map((s) => (
            <section key={s.h} className="space-y-2">
              <h2 className="text-lg font-medium">{s.h}</h2>
              {s.p.map((line) => (
                <p
                  key={line}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {line}
                </p>
              ))}
            </section>
          ))}
          <nav className="flex gap-4 border-t pt-4 text-sm">
            <Link to="/privacy" className="underline">
              {t("legal.privacy.title")}
            </Link>
            <Link to="/data-deletion" className="underline">
              {t("legal.deletion.title")}
            </Link>
          </nav>
        </article>
      </main>
    </CustomerTheme>
  )
}
