import {
  CalendarCheckIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"

import { PageError } from "@/components/page-state"
import BlurText from "@/components/reactbits/BlurText"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { brandStyle, DEFAULT_BRAND } from "@/features/public/brand"
import { BrandMark } from "@/features/public/BrandMark"
import { MobileNav } from "@/features/public/MobileNav"
import { PageSpark } from "@/features/public/PageSpark"
import { useScrollSpy } from "@/features/public/scroll-spy"
import { applyBusinessLanguage } from "@/i18n"
import type { DirectoryBranch, PublicCompany } from "@/lib/api/types"
import { money } from "@/lib/format"
import { placeTypes } from "@/lib/places"
import { webUrl } from "@/lib/url"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/layouts/UserMenu"
import { useSession } from "@/stores/session"

import defaultBranchPhoto from "@/assets/default-branch.jpg"

import { useLiveBranches, usePublicCompany } from "./api"
import { BrandRings } from "@/features/public/BrandRings"

/** From this many branches on, the list gets a search, sport chips and a province picker */
const MANY = 5

/**
 * "/" — the company's own home: its brand, contact and a card per live branch. Guests and
 * customers both land here; a customer sees My bookings in the top bar.
 */
export function BrandHome() {
  const { t } = useTranslation()
  const company = usePublicCompany()
  const branches = useLiveBranches()
  const data = company.data

  useEffect(() => {
    if (!data) return
    applyBusinessLanguage(data.language)
    document.title = data.name
    return () => {
      document.title = "Booking"
    }
  }, [data])

  if (!data) {
    if (company.isError) {
      return (
        <PageError error={company.error} onRetry={() => company.refetch()} />
      )
    }
    return <HomeSkeleton />
  }

  const live = branches.data ?? []
  return (
    <div
      style={brandStyle(data.brand_color, data)}
      className="min-h-dvh bg-[#f3f5f4] pb-24 text-[#141a17] lg:pb-0"
    >
      <PageSpark>
        <TopBar company={data} />
        <Hero company={data} branches={live} />
        <main className="mx-auto max-w-5xl px-4 pt-8 pb-16">
          <section id="branches" className="scroll-mt-20 space-y-5">
            <h2 className="display-tight text-3xl">
              {t("home.branchesTitle", { count: live.length })}
            </h2>
            {branches.isPending ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-64 rounded-2xl" />
                ))}
              </div>
            ) : branches.isError ? (
              <PageError
                error={branches.error}
                onRetry={() => branches.refetch()}
              />
            ) : (
              <BranchList branches={live} company={data} />
            )}
          </section>
        </main>
        <Footer company={data} />
        <HomeNav company={data} />
      </PageSpark>
    </div>
  )
}

/** Tablets and phones: Branches / Contact / My bookings (or Log in) in the Gooey Nav */
function HomeNav({ company }: { company: PublicCompany }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const hasContact =
    !!company.phone ||
    !!company.email ||
    Object.values(company.social_links ?? {}).some((url) => webUrl(url))
  const sections = [
    { id: "branches", label: t("home.nav.branches") },
    ...(hasContact ? [{ id: "contact", label: t("home.nav.contact") }] : []),
  ]
  const { active, jump } = useScrollSpy(sections.map((s) => s.id))
  return (
    <MobileNav
      color={company.brand_color}
      active={active}
      items={[
        ...sections.map((s, i) => ({
          label: s.label,
          onSelect: () => jump(i),
        })),
        {
          label: user ? t("nav.myBookings") : t("actions.logIn"),
          onSelect: () => navigate(user ? "/account" : "/login"),
        },
      ]}
    />
  )
}

function TopBar({ company }: { company: PublicCompany }) {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link to="/" className="mr-auto flex min-w-0 items-center gap-2.5">
          <BrandMark
            name={company.name}
            logo={company.logo_url}
            className="size-8"
          />
          <span className="truncate display-tight text-lg">{company.name}</span>
        </Link>
        {user ? (
          // logged in: the profile circle, whose menu has My bookings and My account
          <UserMenu />
        ) : (
          <>
            <Button asChild variant="ghost" className="h-11 px-3">
              <Link to="/login">{t("actions.logIn")}</Link>
            </Button>
            <Button asChild className="h-11 px-4">
              <Link to="/register">{t("places.signUp")}</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}

function Hero({
  company,
  branches,
}: {
  company: PublicCompany
  branches: DirectoryBranch[]
}) {
  const { t } = useTranslation()
  // one branch: straight to its booking page; several: down to the list
  const only = branches.length === 1 ? branches[0] : undefined
  return (
    <header className="relative overflow-hidden bg-[var(--brand)] text-[var(--brand-foreground)]">
      {company.cover_url && (
        <img
          src={company.cover_url}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-35 mix-blend-luminosity"
        />
      )}
      <BrandRings brand={company.brand_color} colors={company.ring_colors} />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-8 pb-8 sm:pt-12 sm:pb-12">
        <div role="heading" aria-level={1}>
          <BlurText
            text={company.name}
            animateBy="letters"
            trigger="load"
            delay={35}
            className="display-tight text-5xl sm:text-7xl"
          />
        </div>
        {company.description && (
          <p className="max-w-prose text-base whitespace-pre-line opacity-90 sm:text-lg">
            {company.description}
          </p>
        )}
        {branches.length > 0 && (
          <div>
            <Button
              asChild
              className="h-12 bg-[var(--brand-foreground)] px-6 text-base text-[var(--brand)] hover:bg-[var(--brand-foreground)]/90"
            >
              {only ? (
                <Link to={`/b/${only.slug}`}>
                  <CalendarCheckIcon />
                  {t("home.bookNow")}
                </Link>
              ) : (
                <a href="#branches">
                  <CalendarCheckIcon />
                  {t("home.chooseBranch")}
                </a>
              )}
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}

/** The branch cards; with many branches, a search and filters above them (kept in the address) */
function BranchList({
  branches,
  company,
}: {
  branches: DirectoryBranch[]
  company: PublicCompany
}) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const keyword = params.get("q") ?? ""
  const sportType = params.get("sport") ?? ""
  const province = params.get("province") ?? ""
  const [search, setSearch] = useState(keyword)

  const many = branches.length >= MANY
  // only the sports and provinces these branches have: no dead-end choices
  const types = useMemo(
    () => placeTypes(branches.flatMap((b) => b.sports)),
    [branches],
  )
  const provinces = useMemo(
    () => [...new Set(branches.map((b) => b.province).filter(Boolean))],
    [branches],
  )

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const shown = many
    ? branches.filter((b) => {
        const words = keyword.toLowerCase()
        const where = [
          b.name,
          b.address,
          b.province && t(`provinces.${b.province}`),
        ]
          .join(" ")
          .toLowerCase()
        return (
          (!words || where.includes(words)) &&
          (!sportType || b.sports.some((s) => s.type === sportType)) &&
          (!province || b.province === province)
        )
      })
    : branches

  if (branches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-muted-foreground">
        {t("home.noBranches")}
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {many && (
        <div className="space-y-3">
          <form
            role="search"
            className="relative"
            onSubmit={(e) => {
              e.preventDefault()
              set("q", search.trim())
            }}
          >
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label={t("home.search")}
              placeholder={t("places.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                set("q", e.target.value.trim())
              }}
              className="h-12 bg-white pl-10 text-base"
            />
          </form>
          {types.length > 1 && (
            <div
              role="group"
              aria-label={t("places.sport")}
              className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
            >
              {["", ...types].map((type) => (
                <button
                  key={type || "all"}
                  type="button"
                  aria-pressed={sportType === type}
                  onClick={() => set("sport", type)}
                  className={cn(
                    "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                    sportType === type
                      ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
                      : "bg-white",
                  )}
                >
                  {type ? t(`sportTypes.${type}`) : t("places.allSports")}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {provinces.length > 1 && (
              <label className="flex items-center gap-2 text-sm">
                <MapPinIcon className="size-4 text-muted-foreground" />
                <select
                  aria-label={t("places.province")}
                  value={province}
                  onChange={(e) => set("province", e.target.value)}
                  className="h-11 rounded-lg border border-input bg-white px-3 text-base"
                >
                  <option value="">{t("places.allProvinces")}</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {t(`provinces.${p}`)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {t("home.count", { count: shown.length })}
            </p>
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed px-4 py-8 text-center">
          <p className="text-muted-foreground">{t("home.noMatch")}</p>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              setSearch("")
              setParams(new URLSearchParams(), { replace: true })
            }}
          >
            {t("home.showAll")}
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((b) => (
            <li key={b.slug}>
              <BranchCard branch={b} company={company} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BranchCard({
  branch: b,
  company,
}: {
  branch: DirectoryBranch
  company: PublicCompany
}) {
  const { t } = useTranslation()
  const types = placeTypes(b.sports)
  const where = [b.province && t(`provinces.${b.province}`), b.address]
    .filter(Boolean)
    .join(" · ")

  return (
    <Link
      to={`/b/${b.slug}`}
      className="group block overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50 active:shadow-sm"
    >
      <div className="relative h-28 bg-[var(--brand)]">
        {b.cover_url ? (
          <img
            src={b.cover_url}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          // no photo of its own: the project's default one, whole, on its own light background
          <img
            src={defaultBranchPhoto}
            alt=""
            loading="lazy"
            className="size-full bg-[#f7f7f7] object-contain"
          />
        )}
        <span className="absolute -bottom-6 left-4 rounded-xl ring-4 ring-white">
          <BrandMark
            name={company.name}
            logo={company.logo_url}
            className="size-14"
          />
        </span>
      </div>
      <div className="space-y-2 px-4 pt-8 pb-4">
        <h3 className="display-tight text-xl leading-tight">{b.name}</h3>
        {types.length > 0 && (
          <p className="flex flex-wrap gap-1.5">
            {types.map((type) => (
              <span
                key={type}
                className="rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--brand-ink)]"
              >
                {t(`sportTypes.${type}`)}
              </span>
            ))}
          </p>
        )}
        {where && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" />
            <span className="line-clamp-2">{where}</span>
          </p>
        )}
        <p className="flex items-center justify-between gap-2 pt-1">
          <span className="text-sm">
            {b.from_price != null &&
              t("places.from", { price: money(b.from_price, b.currency) })}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-ink)]">
            <CalendarCheckIcon className="size-4" />
            {t("places.book")}
          </span>
        </p>
      </div>
    </Link>
  )
}

function Footer({ company }: { company: PublicCompany }) {
  const { t } = useTranslation()
  const links = Object.entries(company.social_links ?? {}).filter(([, url]) =>
    webUrl(url),
  )
  if (!company.phone && !company.email && links.length === 0) return null
  return (
    <footer id="contact" className="border-t border-black/5 bg-white">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <h2 className="display-tight text-2xl">{t("home.contactTitle")}</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {company.phone && (
            <a
              href={`tel:${company.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex min-h-11 items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <PhoneIcon className="size-4" />
              {company.phone}
            </a>
          )}
          {company.email && (
            <a
              href={`mailto:${company.email}`}
              className="inline-flex min-h-11 items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <MailIcon className="size-4" />
              {company.email}
            </a>
          )}
        </div>
        {links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map(([name, url]) => (
              <a
                key={name}
                href={webUrl(url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center rounded-full border border-black/10 px-5 text-sm font-medium capitalize"
              >
                {name}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  )
}

function HomeSkeleton() {
  return (
    <div style={brandStyle(DEFAULT_BRAND)} aria-busy="true">
      <div className="h-14 border-b bg-white" />
      <Skeleton className="h-56 rounded-none" />
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
