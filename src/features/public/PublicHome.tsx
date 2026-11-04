import {
  CalendarCheckIcon,
  MapIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  StoreIcon,
  TicketIcon,
} from "lucide-react"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router"

import BlurText from "@/components/reactbits/BlurText"
import { money } from "@/lib/format"
import { placeTypes } from "@/lib/places"
import { webUrl } from "@/lib/url"
import { useLiveBranches } from "@/features/places/api"

import { cn } from "@/lib/utils"

import { BookingPanel } from "./BookingPanel"
import { TableBookingPanel } from "./TableBookingPanel"
import { MobileNav } from "./MobileNav"
import { useScrollSpy } from "./scroll-spy"
import { usePublic } from "./context"
import { BrandRings } from "./BrandRings"
import { EventAds } from "./EventAds"
import { heroIsDark } from "./brand"

/** /b/:slug — the business's page: name, booking, classes, coaches, about */
export function PublicHome() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const { hash } = useLocation()

  // menu links are #sections: scroll there (React Router does not)
  useEffect(() => {
    if (!hash) return
    document
      .getElementById(hash.slice(1))
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [hash])

  return (
    <>
      <Hero />
      <main className="mx-auto max-w-5xl space-y-10 px-4 pt-6 pb-32">
        <EventAds />
        <section id="book" className="scroll-mt-20">
          <div className="mb-5">
            <h2 className="display-tight text-3xl">
              <span className="candy-label [--candy:var(--candy-yellow)]">
                {t(
                  business.type === "restaurant"
                    ? "public.tables.bookTitle"
                    : "public.bookTitle",
                )}
              </span>
            </h2>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <StoreIcon className="size-4" />
                {t("public.bookAt", { name: business.name })}
              </p>
              <Link
                to={`/b/${slug}/find`}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-[var(--brand-ink)] underline-offset-4 hover:underline"
              >
                <SearchIcon className="size-4" />
                {t("public.find.link")}
              </Link>
            </div>
          </div>
          {/* a restaurant books tables on its floor plan; a sport place books courts, coaches, classes */}
          {business.type === "restaurant" ? (
            <TableBookingPanel />
          ) : (
            <BookingPanel />
          )}
        </section>
        <Policy />
      </main>
      <SectionNav page="book" />
    </>
  )
}

/** Tablets and phones: Book / Classes / Coaches / About in the Gooey Nav (only the sections the branch has) */
function SectionNav({ page }: { page: "book" }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { slug, business } = usePublic()
  // the parts of the booking page (classes are booked in it: Group class)
  const sections = [
    // "Booking", not "Book": the booking panel has its own Book button
    { id: "book", label: t("public.nav.booking"), show: true },
    {
      id: "policy",
      label: t("public.nav.policy"),
      show: !!business.booking_policy,
    },
  ].filter((s) => s.show)
  const onPage = sections.filter((s) => s.id === "book" || s.id === "policy")
  const spy = useScrollSpy(page === "book" ? onPage.map((s) => s.id) : [])
  const active =
    page === "book"
      ? sections.findIndex((s) => s.id === onPage[spy.active]?.id)
      : sections.findIndex((s) => s.id === page)
  const go = (id: string) => {
    if (id === "classes" || id === "coaches")
      return navigate(`/b/${slug}/${id}`)
    if (page === "book") return spy.jump(onPage.findIndex((s) => s.id === id))
    navigate(`/b/${slug}#${id}`)
  }
  return (
    <MobileNav
      themed
      color={business.brand_color}
      active={Math.max(active, 0)}
      items={[
        ...sections.map((s) => ({
          label: s.label,
          onSelect: () => go(s.id),
        })),
        // leaves the page: an icon only, so the four sections still fit on a phone
        {
          label: t("nav.myBookings"),
          icon: TicketIcon,
          iconOnly: true,
          onSelect: () => navigate("/account"),
        },
      ]}
    />
  )
}

function Hero() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  // sports and "from" price come from the live list (a draft preview is not in it)
  const live = useLiveBranches().data?.find((b) => b.slug === slug)
  const types = live ? placeTypes(live.sports) : []
  const area = business.province ? t(`provinces.${business.province}`) : ""
  const map = webUrl(business.map_url)
  const tel = business.phone.replace(/[^\d+]/g, "")

  const button =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium"
  // on a dark brand colour the name is candy yellow (on a pale one it keeps its dark text)
  const candy = heroIsDark(business.brand_color)
  return (
    <header className="relative overflow-hidden bg-[var(--brand-hero)] text-[var(--brand-hero-foreground)]">
      {business.cover_url && (
        <img
          src={business.cover_url}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-30 mix-blend-luminosity"
        />
      )}
      <BrandRings brand={business.brand_color} colors={business.ring_colors} />
      {/* a light grid behind the text, fading out to the right */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_right,black,transparent_85%)] opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.35) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative mx-auto grid max-w-5xl gap-x-8 gap-y-3 px-4 pt-2 pb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:pt-3 sm:pb-6">
        <div className="flex flex-wrap items-center gap-2 pt-2 sm:col-span-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold tracking-wide uppercase ring-1 ring-white/25 backdrop-blur-sm">
            <StoreIcon className="size-3.5" />
            <span>{t("public.branch")}</span>
            {area && <span className="font-medium opacity-90">· {area}</span>}
          </span>
        </div>

        <div className="min-w-0 space-y-2">
          <div role="heading" aria-level={1}>
            <BlurText
              text={business.name}
              animateBy="letters"
              trigger="load"
              delay={35}
              className={cn(
                "display-tight text-4xl sm:text-5xl",
                candy && "text-[var(--candy-yellow)]",
              )}
            />
          </div>
          {(types.length > 0 || live?.from_price != null) && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              {types.map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-card/15 px-2.5 py-0.5 font-medium"
                >
                  {t(`sportTypes.${type}`)}
                </span>
              ))}
              {live?.from_price != null && (
                <span className="font-semibold">
                  {t("places.from", {
                    price: money(live.from_price, live.currency),
                  })}
                </span>
              )}
            </p>
          )}
          {business.description && (
            <p className="line-clamp-2 max-w-prose text-sm opacity-90 sm:text-base">
              {business.description}
            </p>
          )}
          {business.address && (
            <p className="flex items-center gap-1.5 text-sm opacity-90">
              <MapPinIcon className="size-4 shrink-0" />
              <span className="truncate">{business.address}</span>
            </p>
          )}
        </div>

        {/* phone: a row under the text; wider: a column on the right */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 sm:w-56 sm:grid-cols-1">
          <a
            href="#book"
            className={`${button} rounded-full bg-[var(--candy-yellow)] font-bold text-[var(--candy-ink)] shadow-[0_3px_0_rgb(0_0_0/0.3)]`}
          >
            <CalendarCheckIcon className="size-5" />
            {t("public.bookNow")}
          </a>
          {tel && (
            <a
              href={`tel:${tel}`}
              aria-label={`${t("public.call")} ${business.phone}`}
              className={`${button} ring-1 ring-white/40 hover:bg-card/10`}
            >
              <PhoneIcon className="size-5" />
              <span className="hidden sm:inline">{business.phone}</span>
            </a>
          )}
          {map && (
            <a
              href={map}
              target="_blank"
              rel="noreferrer"
              aria-label={t("public.map")}
              className={`${button} ring-1 ring-white/40 hover:bg-card/10`}
            >
              <MapIcon className="size-5" />
              <span className="hidden sm:inline">{t("public.map")}</span>
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

/** The booking policy (only when the branch or company wrote one), then the social links */
function Policy() {
  const { t } = useTranslation()
  const { business } = usePublic()
  const links = Object.entries(business.social_links ?? {}).filter(([, url]) =>
    webUrl(url),
  )
  return (
    <>
      {business.booking_policy && (
        <section id="policy" className="scroll-mt-20">
          <h2 className="mb-4 display-tight text-3xl">
            <span className="candy-label [--candy:var(--candy-purple)]">
              {t("public.policyTitle")}
            </span>
          </h2>
          <div className="rounded-xl bg-card p-4">
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {business.booking_policy}
            </p>
          </div>
        </section>
      )}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map(([name, url]) => (
            <a
              key={name}
              href={webUrl(url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-full border border-border bg-card px-5 text-sm font-medium capitalize"
            >
              {name}
            </a>
          ))}
        </div>
      )}
    </>
  )
}
