import { CalendarClockIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useCoachAvailabilityDays } from "@/hooks/use-public"
import { dayIn, money, timeIn } from "@/lib/format"
import type {
  AvailabilityQuery,
  CoachAvailability,
  PublicCoach,
} from "@/types/public"

import { usePublic } from "./context"

/** A coach's free times on the day as ranges: each start with its longest length, joined where they touch */
function freeRanges(slots: CoachAvailability["slots"]) {
  const parts = slots
    .map((s) => {
      const start = Date.parse(s.starts_at)
      return [start, start + Math.max(...s.durations_min) * 60_000]
    })
    .sort((a, b) => a[0] - b[0])
  const out: number[][] = []
  for (const [a, b] of parts) {
    const last = out[out.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out.map(([a, b]) => [
    new Date(a).toISOString(),
    new Date(b).toISOString(),
  ])
}

/**
 * Under the day: the coaches free on it with this space, each with their free hours ("07:00–14:00") and a Schedule
 * button that opens the times they can be booked over the next days in a popup. Coaches with no free time that day are not listed.
 */
export function CoachDay({
  coaches,
  free,
  date,
  days,
  base,
  tz,
  included,
}: {
  coaches: PublicCoach[]
  free: CoachAvailability[]
  date: string
  /** the days that can be booked: the schedule shows the next 7 from the day picked */
  days: string[]
  /** the space (and sport) the times are with */
  base: Omit<AvailabilityQuery, "date">
  tz: string
  /** coaches that come free with the space ("Included") */
  included: number[]
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<PublicCoach | null>(null)
  const day = dayIn(`${date}T12:00:00`, tz)
  const rows = coaches
    .map((c) => ({ c, slots: free.find((f) => f.coach_id === c.id)?.slots }))
    .filter((r) => r.slots?.length)
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">
        {t("public.coachDay.title", { day })}
      </h3>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
          {t("public.coachDay.none")}
        </p>
      ) : (
        <ul className="divide-y rounded-xl bg-card ring-1 ring-border">
          {rows.map(({ c, slots }) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {freeRanges(slots!)
                    .map(([a, b]) => `${timeIn(a, tz)}–${timeIn(b, tz)}`)
                    .join(", ")}
                </p>
              </div>
              {included.includes(c.id) ? (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200">
                  {t("public.coachIncluded")}
                </span>
              ) : (
                c.price_per_hour !== null &&
                c.currency && (
                  <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
                    {t("public.perHour", {
                      price: money(c.price_per_hour, c.currency),
                    })}
                  </span>
                )
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 shrink-0 lg:h-9"
                aria-label={t("public.coachDay.scheduleOf", { name: c.name })}
                onClick={() => setOpen(c)}
              >
                <CalendarClockIcon />
                <span className="hidden sm:inline">
                  {t("public.coachDay.schedule")}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <ScheduleDialog
          coach={open}
          dates={days.slice(
            Math.max(0, days.indexOf(date)),
            Math.max(0, days.indexOf(date)) + 7,
          )}
          base={base}
          tz={tz}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  )
}

/**
 * A coach's schedule: the times they can be booked with this space, day by day for the next 7 days from the day picked.
 * Only days with free time are listed (a day off or a fully booked day is left out).
 */
function ScheduleDialog({
  coach,
  dates,
  base,
  tz,
  onClose,
}: {
  coach: PublicCoach
  dates: string[]
  base: Omit<AvailabilityQuery, "date">
  tz: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { slug } = usePublic()
  const answers = useCoachAvailabilityDays(slug, base, dates)
  const loading = answers.some((a) => a.isPending)
  const days = dates
    .map((date, i) => ({
      date,
      ranges: freeRanges(
        answers[i].data?.find((f) => f.coach_id === coach.id)?.slots ?? [],
      ),
    }))
    .filter((d) => d.ranges.length > 0)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{coach.name}</DialogTitle>
          {coach.bio && <DialogDescription>{coach.bio}</DialogDescription>}
        </DialogHeader>
        <h4 className="text-sm font-semibold">
          {t("public.coachDay.freeTimes")}
        </h4>
        {loading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : days.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("public.coachDay.noneWeek")}
          </p>
        ) : (
          <dl className="divide-y rounded-lg ring-1 ring-border">
            {days.map((d) => (
              <div key={d.date} className="space-y-1.5 px-3 py-2.5">
                <dt className="text-sm font-medium">
                  {dayIn(`${d.date}T12:00:00`, tz)}
                </dt>
                <dd className="flex flex-wrap gap-1.5">
                  {d.ranges.map(([a, b]) => (
                    <span
                      key={a}
                      className="rounded-full bg-muted px-2.5 py-1 text-sm tabular-nums"
                    >
                      {timeIn(a, tz)}–{timeIn(b, tz)}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  )
}
