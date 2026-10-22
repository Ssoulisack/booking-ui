import { MapPinIcon, PhoneIcon, UsersIcon } from "lucide-react"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router"

import BlurText from "@/components/reactbits/BlurText"
import { dayIn, money, timeIn } from "@/lib/format"
import { webUrl } from "@/lib/url"

import { useCoaches, useUpcomingClasses } from "./api"
import { BookingPanel } from "./BookingPanel"
import { usePublic } from "./context"
import { BrandRings } from "./BrandRings"

/** /b/:slug — the business's page: name, booking, classes, coaches, about */
export function PublicHome() {
  const { t } = useTranslation()
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
          <h2 className="mb-5 text-3xl display-tight">
            {t("public.bookTitle")}
          </h2>
          <BookingPanel />
        </section>
        <UpcomingClasses />
        <Coaches />
        <About />
      </main>
    </>
  )
}

function Hero() {
  const { business } = usePublic()
  return (
    <header className="relative overflow-hidden bg-[var(--brand)] text-[var(--brand-foreground)]">
      {business.cover_url && (
        <img
          src={business.cover_url}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-35 mix-blend-luminosity"
        />
      )}
      <BrandRings brand={business.brand_color} />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-8 pb-7 sm:pt-12 sm:pb-10">
        {business.company_name && business.company_name !== business.name && (
          <p className="text-sm font-semibold tracking-wide uppercase opacity-80">
            {business.company_name}
          </p>
        )}
        <div role="heading" aria-level={1}>
          <BlurText
            text={business.name}
            animateBy="letters"
            trigger="load"
            delay={35}
            className="text-5xl display-tight sm:text-7xl"
          />
        </div>
        {business.description && (
          <p className="max-w-prose text-base opacity-90 sm:text-lg">
            {business.description}
          </p>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {business.address && (
            <a
              href={webUrl(business.map_url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <MapPinIcon className="size-4" />
              {business.address}
            </a>
          )}
          {business.phone && (
            <a
              href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex min-h-11 items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <PhoneIcon className="size-4" />
              {business.phone}
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

function UpcomingClasses() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const classes = useUpcomingClasses(slug)
  if (!classes.data?.length) return null
  const tz = business.timezone
  return (
    <section id="classes" className="scroll-mt-20">
      <h2 className="mb-4 text-3xl display-tight">
        {t("public.classesTitle")}
      </h2>
      <ul className="divide-y divide-black/10 rounded-xl bg-white">
        {classes.data.map((c) => (
          <li key={c.id} className="flex items-center gap-4 px-4 py-3">
            <div className="w-20 shrink-0 text-center">
              <p className="text-xs text-muted-foreground">
                {dayIn(c.starts_at, tz)}
              </p>
              <p className="text-xl display-tight tabular-nums">
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
          </li>
        ))}
      </ul>
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
      <h2 className="mb-4 text-3xl display-tight">
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
                className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-2xl display-tight text-[var(--brand-ink)]"
              >
                {c.name.charAt(0)}
              </span>
            )}
            <div className="min-w-0 space-y-1">
              <h3 className="text-2xl display-tight">{c.name}</h3>
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

function About() {
  const { t } = useTranslation()
  const { business } = usePublic()
  const links = Object.entries(business.social_links ?? {}).filter(([, url]) =>
    webUrl(url),
  )
  return (
    <section id="about" className="scroll-mt-20 space-y-4">
      <h2 className="text-3xl display-tight">{t("public.aboutTitle")}</h2>
      {business.booking_policy && (
        <div className="rounded-xl bg-white p-4">
          <h3 className="mb-1 font-semibold">{t("public.policyTitle")}</h3>
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {business.booking_policy}
          </p>
        </div>
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
    </section>
  )
}
