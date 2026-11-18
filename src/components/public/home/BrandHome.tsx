import {
  ArrowLeftIcon,
  CalendarCheckIcon,
  ChevronRightIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"

import { PageError } from "@/components/global/page-state"
import BlurText from "@/components/reactbits/BlurText"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { brandStyle } from "@/components/public/booking/brand"
import { ThemeToggle } from "@/components/public/booking/ThemeToggle"
import {
  useBrandOnPage,
  usePublicTheme,
} from "@/components/public/booking/theme"
import { BrandMark } from "@/components/public/booking/BrandMark"
import { MobileNav } from "@/components/public/booking/MobileNav"
import { PageSpark } from "@/components/public/booking/PageSpark"
import { useScrollSpy } from "@/components/public/booking/scroll-spy"
import { applyBusinessLanguage } from "@/i18n"
import type { DirectoryBranch } from "@/types/place"
import type { PublicCompany } from "@/types/public"
import { money } from "@/lib/format"
import { placeTypes, SPORT_TYPES, type SportType } from "@/lib/places"
import { webUrl } from "@/lib/url"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/layout/UserMenu"
import { useSession } from "@/stores/session"

import { useLiveBranches, usePublicCompany } from "@/hooks/use-place"
import { LanguageToggle } from "@/components/global/LanguageToggle"

/** From this many branches in a group on, the list gets a search and a province picker */
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
  const mode = usePublicTheme()
  const brand = brandStyle(data, mode)
  useBrandOnPage(brand)

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
      style={brand}
      className="min-h-dvh bg-background pb-24 text-foreground lg:pb-0"
    >
      <PageSpark>
        <TopBar company={data} />
        <Hero company={data} branches={live} />
        <main className="mx-auto max-w-5xl px-4 pt-8 pb-16">
          <section id="branches" className="scroll-mt-20 space-y-5">
            <h2 className="display-tight text-3xl">
              <span className="candy-label [--candy:var(--candy-yellow)]">
                {t("home.branchesTitle", { count: live.length })}
              </span>
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
      themed
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
    <header className="pub-rainbow sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link to="/" className="mr-auto flex min-w-0 items-center gap-2.5">
          <BrandMark
            name={company.name}
            logo={company.logo_url}
            className="size-8"
          />
          <span className="truncate display-tight text-lg">{company.name}</span>
        </Link>
        <LanguageToggle />
        <ThemeToggle />
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
    <header className="relative overflow-hidden bg-[var(--brand-hero)] text-[var(--brand-hero-foreground)]">
      {company.cover_url && (
        <img
          src={company.cover_url}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-35 mix-blend-luminosity"
        />
      )}
      <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-8 pb-8 sm:pt-12 sm:pb-12">
        <div role="heading" aria-level={1}>
          <BlurText
            text={company.name}
            animateBy="letters"
            trigger="load"
            delay={35}
            className={cn(
              "display-tight text-5xl sm:text-7xl",
              "text-[var(--candy-yellow)]",
            )}
          />
        </div>
        {company.description && (
          <p className="max-w-prose text-base whitespace-pre-line opacity-90 sm:text-lg">
            {company.description}
          </p>
        )}
        {/* phones and tablets: the bottom menu (HomeNav) already leads to the branches */}
        {branches.length > 0 && (
          <div className="hidden lg:block">
            <Button
              asChild
              className="h-12 bg-[var(--brand)] px-6 text-base text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
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

/** A group on the home page: a sport (branches that have it) or "restaurant" */
type GroupKey = SportType | "restaurant"

/** The branches grouped by what they offer: one group per sport, and the restaurants; a branch with
 * several sports is in each of them. A sport branch with no known sport yet goes under "other". */
function groupBranches(branches: DirectoryBranch[]) {
  const groups = new Map<GroupKey, DirectoryBranch[]>()
  const add = (key: GroupKey, b: DirectoryBranch) =>
    groups.set(key, [...(groups.get(key) ?? []), b])
  for (const b of branches) {
    if (b.type === "restaurant") {
      add("restaurant", b)
      continue
    }
    const types = placeTypes(b.sports)
    if (types.length === 0) add("other", b)
    for (const type of types) add(type, b)
  }
  // the sports in the usual order, "other" and the restaurants last
  const order = (k: GroupKey) =>
    k === "restaurant" ? 1000 : k === "other" ? 999 : SPORT_TYPES.indexOf(k)
  return [...groups.entries()].sort(([a], [b]) => order(a) - order(b))
}

/**
 * The branches, grouped: first a tile per sport (and Restaurant), then the branches of the tile
 * tapped (?sport=… in the address, so Back returns to the tiles). One group only: its branches
 * straight away. With many branches in a group, a search and a province picker above them.
 */
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
  const province = params.get("province") ?? ""
  const [search, setSearch] = useState(keyword)

  const groups = useMemo(() => groupBranches(branches), [branches])
  const grouped = groups.length > 1
  const wanted = params.get("sport") ?? ""
  const group = groups.find(([key]) => key === wanted)
  const label = (key: GroupKey) =>
    key === "restaurant"
      ? t("company.types.restaurant")
      : t(`sportTypes.${key}`)

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  // choosing a group is a step: the phone's Back button comes back to the tiles
  const open = (key: GroupKey | "") => {
    const next = new URLSearchParams()
    if (key) next.set("sport", key)
    setSearch("")
    setParams(next)
    document
      .getElementById("branches")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (branches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-muted-foreground">
        {t("home.noBranches")}
      </p>
    )
  }

  if (grouped && !group) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">{t("home.chooseSport")}</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {groups.map(([key, list]) => {
            const cover = list.find((b) => b.cover_url)?.cover_url
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => open(key)}
                  className="group relative flex h-32 w-full flex-col justify-end overflow-hidden candy-card bg-[var(--brand-hero)] p-3 text-left text-[var(--brand-hero-foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-ring/50 active:translate-y-0"
                >
                  {cover && (
                    <img
                      src={cover}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover opacity-45"
                    />
                  )}
                  <span className="relative display-tight text-xl leading-tight">
                    {label(key)}
                  </span>
                  <span className="relative flex items-center justify-between gap-1 text-sm opacity-90">
                    {t("home.count", { count: list.length })}
                    <ChevronRightIcon className="size-4" />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  const inGroup = group ? group[1] : branches
  const many = inGroup.length >= MANY
  const provinces = [...new Set(inGroup.map((b) => b.province).filter(Boolean))]
  const shown = many
    ? inGroup.filter((b) => {
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
          (!province || b.province === province)
        )
      })
    : inGroup

  return (
    <div className="space-y-5">
      {group && grouped && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button
            variant="ghost"
            className="-ml-3 h-11"
            onClick={() => open("")}
          >
            <ArrowLeftIcon />
            {t("places.allSports")}
          </Button>
          <h3 className="display-tight text-2xl">{label(group[0])}</h3>
          <span className="text-sm text-muted-foreground">
            {t("home.count", { count: inGroup.length })}
          </span>
        </div>
      )}
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
              className="h-12 bg-card pl-10 text-base"
            />
          </form>
          <div className="flex flex-wrap items-center gap-3">
            {provinces.length > 1 && (
              <label className="flex items-center gap-2 text-sm">
                <MapPinIcon className="size-4 text-muted-foreground" />
                <select
                  aria-label={t("places.province")}
                  value={province}
                  onChange={(e) => set("province", e.target.value)}
                  className="h-11 rounded-lg border border-input bg-card px-3 text-base"
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
              const next = new URLSearchParams()
              if (group) next.set("sport", group[0])
              setParams(next, { replace: true })
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
      className="group block overflow-hidden candy-card bg-card transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-ring/50 active:translate-y-0"
    >
      <div className="relative h-28 bg-[var(--brand-hero)]">
        {b.cover_url && (
          <img
            src={b.cover_url}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        )}
        {company.logo_url && (
          <span className="absolute -bottom-6 left-4 rounded-xl ring-4 ring-card">
            <BrandMark
              name={company.name}
              logo={company.logo_url}
              className="size-14"
            />
          </span>
        )}
      </div>
      <div
        className={cn(
          "space-y-2 px-4 pb-4",
          company.logo_url ? "pt-8" : "pt-4",
        )}
      >
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
    <footer id="contact" className="border-t border-border bg-card">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <h2 className="display-tight text-2xl">
          <span className="candy-label [--candy:var(--candy-sky)]">
            {t("home.contactTitle")}
          </span>
        </h2>
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
                className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-medium capitalize"
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
    <div style={brandStyle()} aria-busy="true">
      <div className="h-14 border-b bg-card" />
      <Skeleton className="h-56 rounded-none" />
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
