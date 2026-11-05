import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PublicEvent } from "@/lib/api/types"
import { cn } from "@/lib/utils"

import { EventLineup, EventWhen } from "./EventProgram"
import { eventDays, hasDatedRows } from "./event-program"

/** All about one event in a dialog (not a new page): when, where, the lineup, and the way to the tables */
export function EventDetailsDialog({
  event,
  slug,
  onClose,
}: {
  event: PublicEvent | null
  slug: string
  onClose: () => void
}) {
  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {event && <DetailsBody event={event} slug={slug} />}
      </DialogContent>
    </Dialog>
  )
}

function DetailsBody({ event, slug }: { event: PublicEvent; slug: string }) {
  const { t } = useTranslation()
  // an event with a program that differs by day: pick the day to see its lineup
  const days = daysOf(event)
  const [day, setDay] = useState(days[0])
  const picture = event.ad_url || event.background_url
  return (
    <>
      <DialogHeader>
        <DialogTitle>{event.name}</DialogTitle>
        <DialogDescription>{eventDays(event)}</DialogDescription>
      </DialogHeader>
      {picture && (
        <img
          src={picture}
          alt=""
          className="aspect-[16/9] w-full rounded-xl object-cover"
        />
      )}
      <EventWhen
        start={event.start_time}
        end={event.end_time}
        areas={event.areas}
      />
      {event.description && (
        <p className="text-sm whitespace-pre-line text-muted-foreground">
          {event.description}
        </p>
      )}
      {days.length > 1 && hasDatedRows(event.lineup) && (
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1"
          role="group"
          aria-label={t("public.events.days")}
        >
          {days.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={d === day}
              onClick={() => setDay(d)}
              className={cn(
                "h-10 shrink-0 rounded-lg border px-3 text-sm font-medium",
                d === day
                  ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
                  : "bg-card",
              )}
            >
              {new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
            </button>
          ))}
        </div>
      )}
      <EventLineup lineup={event.lineup} day={day} />
      <Button
        asChild
        className="h-11 w-full bg-[var(--brand)] text-base text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
      >
        <Link
          to={`/b/${slug}/events/${event.id}${days.length > 1 ? `?date=${day}` : ""}`}
        >
          {t("public.events.book")}
        </Link>
      </Button>
    </>
  )
}

/** Every day of the event (at most 31), as YYYY-MM-DD */
function daysOf(e: { starts_on: string; ends_on: string }) {
  const out: string[] = []
  const d = new Date(`${e.starts_on}T12:00:00Z`)
  const last = e.ends_on || e.starts_on
  while (d.toISOString().slice(0, 10) <= last && out.length < 31) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}
