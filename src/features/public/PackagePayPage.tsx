import { ArrowLeftIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useLocation, useParams } from "react-router"

import { PageError } from "@/components/global/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { money } from "@/lib/format"
import { leftLabel, optionLabel, ymdLabel, coversLabel } from "@/lib/packages"
import { useSession } from "@/stores/session"

import { useMyPackages } from "./api"
import { usePublic } from "./context"
import { PackagePay } from "./PackagePay"

/** /b/:slug/package/:id — a package the customer bought: pay for it, or see that it is ready to use */
export function PackagePayPage() {
  const { t } = useTranslation()
  const { slug } = usePublic()
  const { id } = useParams()
  const user = useSession((s) => s.user)
  const { pathname } = useLocation()
  const mine = useMyPackages(!!user)

  if (!user)
    return (
      <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />
    )
  const pkg = mine.data?.find(
    (p) => String(p.id) === id && p.branch_slug === slug,
  )

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 pt-4 pb-16">
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link to={`/b/${slug}#packages`}>
          <ArrowLeftIcon />
          {t("packages.my.backToPackages")}
        </Link>
      </Button>
      <h1 className="display-tight text-4xl">{t("packages.my.pageTitle")}</h1>
      {mine.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : mine.isError ? (
        <PageError error={mine.error} onRetry={() => mine.refetch()} />
      ) : !pkg ? (
        <p className="rounded-xl bg-card p-4 ring-1 ring-border">
          {t("packages.my.notFound")}
        </p>
      ) : (
        <>
          <section className="space-y-1 rounded-xl bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="display-tight text-2xl">{pkg.name}</p>
                <p className="text-sm text-muted-foreground">
                  {coversLabel(t, pkg)} · {optionLabel(t, pkg)}
                </p>
              </div>
              <Badge variant="secondary">
                {t(`packages.status.${pkg.status}`)}
              </Badge>
            </div>
            <p className="display-tight text-2xl tabular-nums">
              {money(pkg.price, pkg.currency)}
            </p>
            <p className="text-xs text-muted-foreground">{pkg.code}</p>
            {pkg.payment_status === "paid" && (
              <p className="text-sm font-medium">
                {leftLabel(t, pkg, ymdLabel)}
                {pkg.kind === "times" &&
                  pkg.expires_on &&
                  ` · ${t("packages.useBy", { day: ymdLabel(pkg.expires_on) })}`}
              </p>
            )}
          </section>
          <PackagePay slug={slug} pkg={pkg} />
          {pkg.status === "active" && (
            <Button asChild size="lg" className="h-12 w-full text-base">
              <Link to={`/b/${slug}#book`}>{t("packages.my.bookNow")}</Link>
            </Button>
          )}
        </>
      )}
    </main>
  )
}
