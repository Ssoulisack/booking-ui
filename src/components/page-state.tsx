import { useTranslation } from "react-i18next"
import { Link, useRouteError } from "react-router"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

/** Full-area loading state while a page's first data arrives */
export function PageLoader() {
  const { t } = useTranslation()
  return (
    <div
      className="flex min-h-[50dvh] items-center justify-center gap-2 text-muted-foreground"
      aria-busy="true"
    >
      <Spinner className="size-5" />
      <span className="text-sm">{t("loading")}</span>
    </div>
  )
}

export function PageError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-md space-y-4 py-10">
      <ErrorAlert error={error} />
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {t("actions.tryAgain")}
        </Button>
      )}
    </div>
  )
}

export function PageTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-6 space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {lead && <p className="text-muted-foreground">{lead}</p>}
    </div>
  )
}

export function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <PageTitle title={t("notFound.title")} lead={t("notFound.lead")} />
      <Button asChild>
        <Link to="/">{t("actions.goHome")}</Link>
      </Button>
    </div>
  )
}

/** Shown instead of a blank page if a screen crashes: a way back, never a stack trace */
export function CrashScreen() {
  const { t } = useTranslation()
  const error = useRouteError()
  console.error(error)
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <PageTitle title={t("crash.title")} lead={t("crash.lead")} />
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>
          {t("actions.tryAgain")}
        </Button>
        <Button asChild variant="outline">
          <Link to="/">{t("actions.goHome")}</Link>
        </Button>
      </div>
    </div>
  )
}
