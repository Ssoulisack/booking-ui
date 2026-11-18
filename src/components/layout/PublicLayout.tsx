import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Link, Navigate, Outlet, useLocation, useParams } from "react-router"

import { useSession } from "@/stores/session"

import { PageError } from "@/components/global/page-state"
import { UnsavedGuard } from "@/components/global/UnsavedGuard"
import { Skeleton } from "@/components/ui/skeleton"
import { applyBusinessLanguage } from "@/i18n"
import { ApiError } from "@/lib/api/client"
import type { PublicBranch } from "@/types/public"

import { usePublicBranch } from "@/hooks/use-public"
import { brandStyle } from "@/components/public/booking/brand"
import { BranchSwitcher } from "@/components/public/booking/BranchSwitcher"
import { rememberBranchName } from "@/components/public/booking/origin"
import { PageSpark } from "@/components/public/booking/PageSpark"
import type { PublicContext } from "@/components/public/booking/context"
import {
  CustomerHeader,
  useCustomerMenu,
} from "@/components/public/booking/CustomerHeader"
import {
  useBrandOnPage,
  usePublicTheme,
} from "@/components/public/booking/theme"

/** /b/:slug/* — a branch's public pages, in the company's brand colour and language */
export function PublicLayout() {
  const { slug = "" } = useParams()
  const business = usePublicBranch(slug)
  const token = useSession((s) => s.accessToken)
  const { pathname, search, hash } = useLocation()
  const mode = usePublicTheme()
  const brand = brandStyle(business.data, mode)
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
  // a branch that takes bookings from accounts only: log in first, then back to this same page (?next=). A guest's
  // private booking link and "find my booking" stay open (bookings made before the branch asked for accounts).
  if (
    !token &&
    business.data.booking_mode === "account" &&
    !/^\/b\/[^/]+\/(booking|find)(\/|$)/.test(pathname)
  ) {
    const here = encodeURIComponent(pathname + search + hash)
    return <Navigate to={`/login?next=${here}`} replace />
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
    <div style={brandStyle()} aria-busy="true">
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
