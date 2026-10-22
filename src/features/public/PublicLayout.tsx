import { MenuIcon, TicketIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, Outlet, useLocation, useParams } from "react-router"

import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { applyBusinessLanguage } from "@/i18n"
import { ApiError } from "@/lib/api/client"
import type { PublicBranch } from "@/lib/api/types"
import { useSession } from "@/stores/session"

import { usePublicBranch } from "./api"
import { brandStyle, DEFAULT_BRAND } from "./brand"
import { BrandMark } from "./BrandMark"
import type { PublicContext } from "./context"

/** /b/:slug/* — a branch's public pages, in the company's brand colour and language */
export function PublicLayout() {
  const { slug = "" } = useParams()
  const business = usePublicBranch(slug)
  const data = business.data

  useEffect(() => {
    if (!data) return
    applyBusinessLanguage(data.language)
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
      style={brandStyle(business.data.brand_color)}
      className="min-h-dvh bg-[#f3f5f4] text-[#141a17]"
    >
      <PublicTopBar business={business.data} />
      <Outlet
        context={{ slug, business: business.data } satisfies PublicContext}
      />
    </div>
  )
}

function PublicTopBar({ business }: { business: PublicBranch }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const user = useSession((s) => s.user)
  const { pathname } = useLocation()
  const home = `/b/${business.slug}`
  const loginLink = `/login?next=${encodeURIComponent(pathname)}`

  const sections = [
    { hash: "book", label: t("public.nav.book") },
    { hash: "classes", label: t("public.nav.classes") },
    { hash: "coaches", label: t("public.nav.coaches") },
    { hash: "about", label: t("public.nav.about") },
  ]

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link to={home} className="flex min-w-0 items-center gap-2.5">
          <BrandMark
            name={business.company_name}
            logo={business.logo_url}
            className="size-8"
          />
          <span className="truncate text-lg display-tight">
            {business.name}
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {sections.map((s) => (
            <Button key={s.hash} asChild variant="ghost" className="h-11 px-3">
              <Link to={`${home}#${s.hash}`}>{s.label}</Link>
            </Button>
          ))}
          <Button
            asChild
            variant="ghost"
            className="h-11 px-3 text-muted-foreground"
          >
            <Link to="/">{t("public.allBranches")}</Link>
          </Button>
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          {user ? (
            <Button asChild variant="ghost" className="h-11 gap-2 px-3">
              <Link to="/account" aria-label={t("nav.myBookings")}>
                <TicketIcon />
                <span className="hidden sm:inline">{t("nav.myBookings")}</span>
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="h-11 px-4">
              <Link to={loginLink}>{t("actions.logIn")}</Link>
            </Button>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-11 md:hidden"
                aria-label={t("nav.menu")}
              >
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>{business.name}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-2">
                {sections.map((s) => (
                  <Link
                    key={s.hash}
                    to={`${home}#${s.hash}`}
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center rounded-lg px-3 text-base font-medium hover:bg-muted"
                  >
                    {s.label}
                  </Link>
                ))}
                <Link
                  to={user ? "/account" : loginLink}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center rounded-lg px-3 text-base font-medium hover:bg-muted"
                >
                  {user ? t("nav.myBookings") : t("actions.logIn")}
                </Link>
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center rounded-lg px-3 text-base font-medium text-muted-foreground hover:bg-muted"
                >
                  {t("public.allBranches")}
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function PublicSkeleton() {
  return (
    <div style={brandStyle(DEFAULT_BRAND)} aria-busy="true">
      <div className="h-14 border-b bg-white" />
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
      <h1 className="text-4xl display-tight">{t("public.notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("public.notFoundLead")}</p>
      <Link to="/" className="font-medium underline underline-offset-4">
        {t("public.allBranches")}
      </Link>
    </main>
  )
}
