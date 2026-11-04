import { CalendarDaysIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import type { PublicEvent } from "@/lib/api/types"
import { money } from "@/lib/format"

import { useEvents } from "./api"
import { usePublic } from "./context"

/** "4 Nov 2026" or "31 Dec – 1 Jan 2027" */
export function eventDays(e: { starts_on: string; ends_on: string }) {
  const fmt = (d: string, year: boolean) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      ...(year ? { year: "numeric" } : {}),
    })
  return !e.ends_on || e.ends_on === e.starts_on
    ? fmt(e.starts_on, true)
    : `${fmt(e.starts_on, false)} – ${fmt(e.ends_on, true)}`
}

/** The small ads of the branch's events (a restaurant only): picture, name, day, price, "Book a table" */
export function EventAds() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const events = useEvents(slug, business.type === "restaurant")
  if (!events.data?.length) return null

  return (
    <section aria-labelledby="events-title" className="scroll-mt-20">
      <h2 id="events-title" className="mb-4 display-tight text-3xl">
        <span className="candy-label [--candy:var(--candy-pink)]">
          {t("public.events.title")}
        </span>
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {events.data.map((e) => (
          <li key={e.id}>
            <EventCard event={e} slug={slug} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function EventCard({ event, slug }: { event: PublicEvent; slug: string }) {
  const { t } = useTranslation()
  const picture = event.ad_url || event.background_url
  return (
    <Link
      to={`/b/${slug}/events/${event.id}`}
      className="group block overflow-hidden rounded-xl bg-card ring-1 ring-border outline-none focus-visible:ring-3 focus-visible:ring-ring"
    >
      <div className="relative aspect-[16/9] bg-[var(--brand-soft)]">
        {picture ? (
          <img
            src={picture}
            alt=""
            className="size-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <CalendarDaysIcon className="absolute inset-0 m-auto size-10 text-[var(--brand-ink)]/50" />
        )}
      </div>
      <div className="space-y-1 p-4">
        <h3 className="text-lg font-semibold">{event.name}</h3>
        <p className="text-sm text-muted-foreground">{eventDays(event)}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {event.from_price > 0 && (
            <span className="text-sm font-medium">
              {t("public.events.from", {
                price: money(event.from_price, event.currency),
              })}
            </span>
          )}
          <span className="inline-flex h-9 items-center rounded-lg bg-[var(--brand)] px-3 text-sm font-medium text-[var(--brand-foreground)]">
            {t("public.events.book")}
          </span>
        </div>
      </div>
    </Link>
  )
}
