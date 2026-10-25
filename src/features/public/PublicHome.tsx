import {
  ArrowLeftIcon,
  CalendarCheckIcon,
  MapIcon,
  MapPinIcon,
  PhoneIcon,
  StoreIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router"

import BlurText from "@/components/reactbits/BlurText"
import AnimatedList from "@/components/reactbits/AnimatedList"
import { dayIn, money, timeIn, todayIn } from "@/lib/format"
import { placeTypes } from "@/lib/places"
import { webUrl } from "@/lib/url"
import { useLiveBranches } from "@/features/places/api"

import { useCoaches, useUpcomingClassPages, useUpcomingClasses } from "./api"
import { BookingPanel } from "./BookingPanel"
import { MobileNav } from "./MobileNav"
import { dayColorOf } from "./day-colors"
import { useScrollSpy } from "./scroll-spy"
import { useSelection } from "./selection"
import { usePublic } from "./context"
import { BrandRings } from "./BrandRings"

/** /b/:slug — the business's page: name, booking, classes, coaches, about */
export function PublicHome() {
  const { t } = useTranslation()
  const { business } = usePublic()
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
        <section id="book" className="scroll-mt-20">
          <div className="mb-5">
            <h2 className="display-tight text-3xl">{t("public.bookTitle")}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <StoreIcon className="size-4" />
              {t("public.bookAt", { name: business.name })}
            </p>
          </div>
          <BookingPanel />
        </section>
        <UpcomingClasses />
        <Coaches />
        <Policy />
      </main>
      <SectionNav />
    </>
  )
}

/** Tablets and phones: Book / Classes / Coaches / About in the Gooey Nav (only the sections the branch has) */
function SectionNav() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { slug, business } = usePublic()
  const classes = useUpcomingClasses(slug).data
  const coaches = useCoaches(slug).data
  const sections = [
    // "Booking", not "Book": the booking panel has its own Book button
    { id: "book", label: t("public.nav.booking"), show: true },
    { id: "classes", label: t("public.nav.classes"), show: !!classes?.length },
    { id: "coaches", label: t("public.nav.coaches"), show: !!coaches?.length },
    {
      id: "policy",
      label: t("public.nav.policy"),
      show: !!business.booking_policy,
    },
  ].filter((s) => s.show)
  const { active, jump } = useScrollSpy(sections.map((s) => s.id))
  return (
    <MobileNav
      color={business.brand_color}
      active={active}
      items={[
        ...sections.map((s, i) => ({
          label: s.label,
          onSelect: () => jump(i),
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

  return (
    <header className="relative overflow-hidden bg-[var(--brand)] text-[var(--brand-foreground)]">
      {business.cover_url && (
        <img
          src={business.cover_url}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-35 mix-blend-luminosity"
        />
      )}
      <BrandRings brand={business.brand_color} colors={business.ring_colors} />
      <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 pt-3 pb-7 sm:pt-5 sm:pb-10">
        <Link
          to="/"
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium opacity-90 hover:opacity-100"
        >
          <ArrowLeftIcon className="size-4" />
          {t("public.allBranches")}
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold tracking-wide uppercase ring-1 ring-white/25 backdrop-blur-sm">
          <StoreIcon className="size-3.5" />
          <span>{t("public.branch")}</span>
          {area && <span className="font-medium opacity-90">· {area}</span>}
        </span>
        <div role="heading" aria-level={1} className="-mt-1">
          <BlurText
            text={business.name}
            animateBy="letters"
            trigger="load"
            delay={35}
            className="display-tight text-5xl sm:text-7xl"
          />
        </div>
        {(types.length > 0 || live?.from_price != null) && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            {types.map((type) => (
              <span
                key={type}
                className="rounded-full bg-white/15 px-3 py-1 font-medium"
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
          <p className="max-w-prose text-base opacity-90 sm:text-lg">
            {business.description}
          </p>
        )}
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <a
            href="#book"
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-6 font-semibold text-[var(--brand-ink)] shadow-sm sm:flex-none"
          >
            <CalendarCheckIcon className="size-5" />
            {t("public.bookNow")}
          </a>
          {tel && (
            <a
              href={`tel:${tel}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 font-medium ring-1 ring-white/40 hover:bg-white/10"
            >
              <PhoneIcon className="size-5" />
              {t("public.call")}
            </a>
          )}
          {map && (
            <a
              href={map}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 font-medium ring-1 ring-white/40 hover:bg-white/10"
            >
              <MapIcon className="size-5" />
              {t("public.map")}
            </a>
          )}
        </div>
        {(business.address || business.phone) && (
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm opacity-90">
            {business.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPinIcon className="size-4" />
                {business.address}
              </span>
            )}
            {business.phone && (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <PhoneIcon className="size-4" />
                {business.phone}
              </span>
            )}
          </p>
        )}
      </div>
    </header>
  )
}

/**
 * The next classes in React Bits' AnimatedList (rows pop in as they scroll into view, arrow keys
 * move the highlight). Choosing one picks it in the booking panel above and scrolls there.
 */
function UpcomingClasses() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const classes = useUpcomingClassPages(slug)
  const [, setSel] = useSelection()
  const items = classes.data?.pages.flatMap((p) => p.items) ?? []
  if (items.length === 0) return null
  const tz = business.timezone
  return (
    <section id="classes" className="scroll-mt-20">
      <h2 className="mb-4 display-tight text-3xl">
        {t("public.classesTitle")}
      </h2>
      <AnimatedList
        items={items}
        // six at a time: the next six load as the list is scrolled to its end
        onEndReached={() => {
          if (classes.hasNextPage && !classes.isFetchingNextPage) {
            void classes.fetchNextPage({ cancelRefetch: false })
          }
        }}
        maxHeight={340}
        theme="light"
        width="100%"
        accentColor="var(--brand)"
        animateOnce
        onItemSelect={(c) => {
          setSel({
            sport: c.sport_id,
            what: "class",
            date: todayIn(tz, new Date(c.starts_at)),
            cls: c.id,
            seats: 1,
          })
          document
            .getElementById("book")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        renderItem={(c) => (
          <>
            {/* the colour of the weekday (Monday yellow, Tuesday pink, …) */}
            <div
              className="w-20 shrink-0 rounded-xl py-1.5 text-center"
              style={{
                background: dayColorOf(c.starts_at, tz).bg,
                color: dayColorOf(c.starts_at, tz).fg,
              }}
            >
              <p className="text-xs opacity-90">{dayIn(c.starts_at, tz)}</p>
              <p className="display-tight text-xl tabular-nums">
                {timeIn(c.starts_at, tz)}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.title}</p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <UsersIcon className="size-4" />
                {(c.seats_left ?? c.capacity) > 0
                  ? t("public.seatsLeft", { count: c.seats_left ?? c.capacity })
                  : t("public.classFull")}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium">
              {money(c.price, c.currency)}
            </p>
          </>
        )}
      />
    </section>
  )
}

function Coaches() {
  const { t } = useTranslation()
  const { slug } = usePublic()
  const coaches = useCoaches(slug)
  if (!coaches.data?.length) return null
  return (
    <section id="coaches" className="scroll-mt-20">
      <h2 className="mb-4 display-tight text-3xl">
        {t("public.coachesTitle")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {coaches.data.map((c) => (
          <article key={c.id} className="flex gap-4 rounded-xl bg-white p-4">
            {c.image_url ? (
              <img
                src={c.image_url}
                alt=""
                className="size-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] display-tight text-2xl text-[var(--brand-ink)]"
              >
                {c.name.charAt(0)}
              </span>
            )}
            <div className="min-w-0 space-y-1">
              <h3 className="display-tight text-2xl">{c.name}</h3>
              <p className="text-sm text-[var(--brand-ink)]">
                {c.sports.map((s) => s.name).join(", ")}
                {c.price_per_hour !== null && c.currency && (
                  <>
                    {" · "}
                    {t("public.perHour", {
                      price: money(c.price_per_hour, c.currency),
                    })}
                  </>
                )}
              </p>
              {c.bio && (
                <p className="text-sm text-muted-foreground">{c.bio}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
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
            {t("public.policyTitle")}
          </h2>
          <div className="rounded-xl bg-white p-4">
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
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium capitalize"
            >
              {name}
            </a>
          ))}
        </div>
      )}
    </>
  )
}
