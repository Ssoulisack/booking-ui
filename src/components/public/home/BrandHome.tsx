import {
  ArrowRightIcon,
  CalendarCheckIcon,
  LayoutGridIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  TrophyIcon,
  UtensilsIcon,
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
type Tab = "all" | "sport" | "restaurant"

/** A branch's kind for the tabs: a restaurant, else a sport place */
const kindOf = (b: DirectoryBranch): Exclude<Tab, "all"> =>
  b.type === "restaurant" ? "restaurant" : "sport"

/**
 * The branches: tabs All · Sport · Restaurant (only when the company has both kinds), sport chips inside Sport (when
 * there are several sports), and with many branches a search and a province picker. What is chosen sits in the address
 * (?type=sport&sport=football), so Back and a shared link keep it.
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

  const counts = useMemo(
    () => ({
      all: branches.length,
      sport: branches.filter((b) => kindOf(b) === "sport").length,
      restaurant: branches.filter((b) => kindOf(b) === "restaurant").length,
    }),
    [branches],
  )
  const tabbed = counts.sport > 0 && counts.restaurant > 0
  const asked = params.get("type")
  const tab: Tab =
    tabbed && (asked === "sport" || asked === "restaurant") ? asked : "all"
  const inTab =
    tab === "all" ? branches : branches.filter((b) => kindOf(b) === tab)

  // the sports offered in the Sport tab (or everywhere, when there are no restaurants)
  const sportsHere = useMemo(() => {
    const have = new Set(
      branches
        .filter((b) => kindOf(b) === "sport")
        .flatMap((b) => placeTypes(b.sports)),
    )
    return SPORT_TYPES.filter((x) => x !== "other" && have.has(x))
  }, [branches])
  const showChips =
    (tab === "sport" || (!tabbed && counts.sport > 0)) && sportsHere.length > 1
  const sportAsked = params.get("sport") as SportType | null
  const sport =
    showChips && sportAsked && sportsHere.includes(sportAsked)
      ? sportAsked
      : null
  const inSport = sport
    ? inTab.filter((b) => placeTypes(b.sports).includes(sport))
    : inTab

  const set = (changes: Record<string, string>, push = false) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: !push })
  }

  if (branches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-muted-foreground">
        {t("home.noBranches")}
      </p>
    )
  }

  const many = inSport.length >= MANY
  const provinces = [...new Set(inSport.map((b) => b.province).filter(Boolean))]
  const shown = many
    ? inSport.filter((b) => {
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
    : inSport

  return (
    <div className="space-y-5">
      {tabbed && (
        <div
          role="tablist"
          aria-label={t("home.tabs.label")}
          className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1"
        >
          {(["all", "sport", "restaurant"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => {
                setSearch("")
                set(
                  {
                    type: k === "all" ? "" : k,
                    sport: "",
                    q: "",
                    province: "",
                  },
                  true,
                )
              }}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors",
                tab === k
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {k === "sport" ? (
                <TrophyIcon className="size-4" />
              ) : k === "restaurant" ? (
                <UtensilsIcon className="size-4" />
              ) : (
                <LayoutGridIcon className="size-4" />
              )}
              {t(`home.tabs.${k}`)}
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {counts[k]}
              </span>
            </button>
          ))}
        </div>
      )}

      {showChips && (
        <div className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4">
          {[null, ...sportsHere].map((x) => (
            <button
              key={x ?? "all"}
              type="button"
              aria-pressed={sport === x}
              onClick={() => set({ sport: x ?? "" })}
              className={cn(
                "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                sport === x
                  ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
                  : "border-border bg-card hover:border-foreground/30",
              )}
            >
              {x ? t(`sportTypes.${x}`) : t("places.allSports")}
            </button>
          ))}
        </div>
      )}

      {many && (
        <div className="space-y-3">
          <form
            role="search"
            className="relative"
            onSubmit={(e) => {
              e.preventDefault()
              set({ q: search.trim() })
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
                set({ q: e.target.value.trim() })
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
                  onChange={(e) => set({ province: e.target.value })}
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
              set({ q: "", province: "", sport: "" })
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

/**
 * A branch: its photo (or a soft colour with an icon: sky for sport, peach for restaurants), what kind it is on the
 * photo, then the name, the sports, where it is and the price. Light mode: a white card with a soft edge and shadow;
 * dark mode: the dark card.
 */
function BranchCard({
  branch: b,
  company,
}: {
  branch: DirectoryBranch
  company: PublicCompany
}) {
  const { t } = useTranslation()
  const types = placeTypes(b.sports)
  const restaurant = kindOf(b) === "restaurant"
  const KindIcon = restaurant ? UtensilsIcon : TrophyIcon
  const where = [b.province && t(`provinces.${b.province}`), b.address]
    .filter(Boolean)
    .join(" · ")

  return (
    <Link
      to={`/b/${b.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgb(16_24_40/0.06),0_8px_24px_-12px_rgb(16_24_40/0.18)] ring-1 ring-black/[0.06] transition duration-200 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgb(16_24_40/0.06),0_18px_40px_-16px_rgb(16_24_40/0.28)] focus-visible:outline-3 focus-visible:outline-ring/50 active:translate-y-0 dark:shadow-none dark:ring-white/10"
    >
      <div
        className={cn(
          "relative aspect-[16/9] overflow-hidden",
          !b.cover_url &&
            (restaurant
              ? "bg-gradient-to-br from-orange-100 via-rose-50 to-amber-100 dark:from-orange-400/15 dark:via-rose-400/10 dark:to-amber-400/15"
              : "bg-gradient-to-br from-sky-100 via-emerald-50 to-teal-100 dark:from-sky-400/15 dark:via-emerald-400/10 dark:to-teal-400/15"),
        )}
      >
        {b.cover_url ? (
          <>
            <img
              src={b.cover_url}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent"
            />
          </>
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            {company.logo_url ? (
              <BrandMark
                name={company.name}
                logo={company.logo_url}
                className="size-16 shadow-sm"
              />
            ) : (
              <KindIcon
                className={cn(
                  "size-12 opacity-60",
                  restaurant
                    ? "text-orange-500 dark:text-orange-300"
                    : "text-sky-600 dark:text-sky-300",
                )}
              />
            )}
          </span>
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur dark:bg-black/60 dark:text-white">
          <KindIcon className="size-3.5" />
          {t(restaurant ? "home.tabs.restaurant" : "home.tabs.sport")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg leading-snug font-semibold">{b.name}</h3>
        {types.length > 0 && (
          <p className="flex flex-wrap gap-1.5">
            {types.map((type) => (
              <span
                key={type}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/80"
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
        <p className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3">
          <span className="text-sm">
            {b.from_price != null && (
              <span className="font-semibold">
                {t("places.from", { price: money(b.from_price, b.currency) })}
              </span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-ink)]">
            {t("places.book")}
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
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
