import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Link, Outlet, useParams } from "react-router"

import { PageError } from "@/components/global/page-state"
import { UnsavedGuard } from "@/components/global/UnsavedGuard"
import { Skeleton } from "@/components/ui/skeleton"
import { applyBusinessLanguage } from "@/i18n"
import { ApiError } from "@/lib/api/client"
import type { PublicBranch } from "@/types/public"

import { usePublicBranch } from "@/hooks/use-public"
import { brandStyle, DEFAULT_BRAND } from "./brand"
import { BranchSwitcher } from "./BranchSwitcher"
import { rememberBranchName } from "./origin"
import { PageSpark } from "./PageSpark"
import type { PublicContext } from "./context"
import { CustomerHeader, useCustomerMenu } from "./CustomerHeader"
import { useBrandOnPage, usePublicTheme } from "./theme"

/** /b/:slug/* — a branch's public pages, in the company's brand colour and language */
export function PublicLayout() {
  const { slug = "" } = useParams()
  const business = usePublicBranch(slug)
  const mode = usePublicTheme()
  const brand = brandStyle(business.data?.brand_color, business.data, mode)
  useBrandOnPage(brand)

  const data = business.data
  useEffect(() => {
    if (!data) return
    applyBusinessLanguage(data.language)
    rememberBranchName(data.slug, data.name)
    document.title = data.name
    return () => {
      document.title = "Booking"
    }
  }, [data])

  if (business.isPending) return <PublicSkeleton />
  if (business.isError) {
    if (business.error instanceof ApiError && business.error.status === 404) {
      return <PublicNotFound />
    }
    return (
      <PageError error={business.error} onRetry={() => business.refetch()} />
    )
  }
  return (
    <div style={brand} className="min-h-dvh bg-background text-foreground">
      <PageSpark>
        <UnsavedGuard />
        <PublicTopBar business={business.data} />
        <Outlet
          context={{ slug, business: business.data } satisfies PublicContext}
        />
      </PageSpark>
    </div>
  )
}

function PublicTopBar({ business }: { business: PublicBranch }) {
  const items = useCustomerMenu(business.slug, business)
  return (
    <CustomerHeader
      left={<BranchSwitcher business={business} />}
      items={items}
    />
  )
}

function PublicSkeleton() {
  return (
    <div style={brandStyle(DEFAULT_BRAND)} aria-busy="true">
      <div className="h-16 border-b bg-card" />
      <Skeleton className="h-56 rounded-none" />
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Skeleton className="h-10 w-2/3" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    </div>
  )
}

function PublicNotFound() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4">
      <h1 className="display-tight text-4xl">{t("public.notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("public.notFoundLead")}</p>
      <Link to="/" className="font-medium underline underline-offset-4">
        {t("public.allBranches")}
      </Link>
    </main>
  )
}
