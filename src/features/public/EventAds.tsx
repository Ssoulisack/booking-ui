import { CalendarDaysIcon, InfoIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import type { PublicEvent } from "@/types/event"
import { money } from "@/lib/format"

import { useEvents } from "./api"
import { usePublic } from "./context"
import { EventDetailsDialog } from "./EventDetailsDialog"
import { eventDays, eventTimes } from "./event-program"

export { eventDays } from "./event-program"

/** The small ads of the branch's events (a restaurant only): picture, name, day, price, "Book a table" */
export function EventAds() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const events = useEvents(slug, business.type === "restaurant")
  // the card whose details are open (a dialog, not a new page)
  const [open, setOpen] = useState<PublicEvent | null>(null)
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
            <EventCard event={e} slug={slug} onDetails={() => setOpen(e)} />
          </li>
        ))}
      </ul>
      <EventDetailsDialog
        event={open}
        slug={slug}
        onClose={() => setOpen(null)}
      />
    </section>
  )
}

function EventCard({
  event,
  slug,
  onDetails,
}: {
  event: PublicEvent
  slug: string
  onDetails: () => void
}) {
  const { t } = useTranslation()
  const picture = event.ad_url || event.background_url
  return (
    <div className="group overflow-hidden rounded-xl bg-card ring-1 ring-border">
      <Link
        to={`/b/${slug}/events/${event.id}`}
        className="block outline-none focus-visible:ring-3 focus-visible:ring-ring"
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
        <div className="space-y-1 px-4 pt-4">
          <h3 className="text-lg font-semibold">{event.name}</h3>
          <p className="text-sm text-muted-foreground">
            {eventDays(event)}
            {event.start_time &&
              ` · ${eventTimes(event.start_time, event.end_time)}`}
          </p>
          {event.from_price > 0 && (
            <p className="text-sm font-medium">
              {t("public.events.from", {
                price: money(event.from_price, event.currency),
              })}
            </p>
          )}
        </div>
      </Link>
      <div className="flex flex-wrap gap-2 p-4 pt-3">
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={onDetails}
        >
          <InfoIcon />
          {t("public.events.details")}
        </Button>
        <Button
          asChild
          className="h-10 bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
        >
          <Link to={`/b/${slug}/events/${event.id}`}>
            {t("public.events.book")}
          </Link>
        </Button>
      </div>
    </div>
  )
}
