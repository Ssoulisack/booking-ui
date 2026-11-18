import { LogInIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router"

import { LoginDialog } from "@/components/public/auth/LoginDialog"
import { Button } from "@/components/ui/button"

/**
 * A branch that takes bookings from accounts only: a customer who is not logged in is asked to log in
 * (or create an account) before the first step, not after choosing everything. Log in opens a popup and
 * the page goes on as the customer; Create account comes back here.
 */
export function LoginFirst({ message }: { message?: string } = {}) {
  const { t } = useTranslation()
  const { pathname, search, hash } = useLocation()
  const here = encodeURIComponent(pathname + search + hash)
  const [loggingIn, setLoggingIn] = useState(false)
  return (
    <section className="space-y-3 rounded-xl bg-card p-4">
      <p className="flex items-start gap-2">
        <LogInIcon className="mt-0.5 size-5 shrink-0 text-[var(--brand-ink)]" />
        {message ?? t("public.loginToBook")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button size="lg" className="h-12" onClick={() => setLoggingIn(true)}>
          {t("actions.logIn")}
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12">
          <Link to={`/register?next=${here}`}>{t("register.submit")}</Link>
        </Button>
      </div>
      <LoginDialog open={loggingIn} onClose={() => setLoggingIn(false)} />
    </section>
  )
}
