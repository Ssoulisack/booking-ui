import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Link, Outlet, useLocation, useParams } from "react-router"

import { PageError } from "@/components/page-state"
import { UnsavedGuard } from "@/components/UnsavedGuard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { applyBusinessLanguage } from "@/i18n"
import { ApiError } from "@/lib/api/client"
import type { PublicBranch } from "@/lib/api/types"
import { UserMenu } from "@/layouts/UserMenu"
import { useSession } from "@/stores/session"

import { usePublicBranch } from "./api"
import { brandStyle, DEFAULT_BRAND } from "./brand"
import { BranchSwitcher } from "./BranchSwitcher"
import { rememberBranchName } from "./origin"
import { PageSpark } from "./PageSpark"
import type { PublicContext } from "./context"

/** /b/:slug/* — a branch's public pages, in the company's brand colour and language */
export function PublicLayout() {
  const { slug = "" } = useParams()
  const business = usePublicBranch(slug)

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
    <div
      style={brandStyle(business.data.brand_color, business.data)}
      className="min-h-dvh bg-[#f3f5f4] text-[#141a17]"
    >
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
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const { pathname } = useLocation()
  const home = `/b/${business.slug}`
  const loginLink = `/login?next=${encodeURIComponent(pathname)}`

  const sections = [
    { hash: "book", label: t("public.nav.book") },
    { hash: "classes", label: t("public.nav.classes") },
    { hash: "coaches", label: t("public.nav.coaches") },
    ...(business.booking_policy
      ? [{ hash: "policy", label: t("public.nav.policy") }]
      : []),
  ]

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <BranchSwitcher business={business} />
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {sections.map((s) => (
            <Button key={s.hash} asChild variant="ghost" className="h-11 px-3">
              <Link to={`${home}#${s.hash}`}>{s.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          {user ? (
            // logged in: the profile circle, whose menu has My bookings, All branches, My account
            <UserMenu allBranches />
          ) : (
            <Button asChild variant="outline" className="h-11 px-4">
              <Link to={loginLink}>{t("actions.logIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

function PublicSkeleton() {
  return (
    <div style={brandStyle(DEFAULT_BRAND)} aria-busy="true">
      <div className="h-16 border-b bg-white" />
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
