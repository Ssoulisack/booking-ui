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
import { dayIn, money, timeIn } from "@/lib/format"
import type { CoachAvailability, PublicCoach } from "@/types/public"

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
 * button that opens their week in a popup. Coaches with no free time that day are not listed.
 */
export function CoachDay({
  coaches,
  free,
  date,
  tz,
  included,
}: {
  coaches: PublicCoach[]
  free: CoachAvailability[]
  date: string
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
          day={day}
          slots={free.find((f) => f.coach_id === open.id)?.slots ?? []}
          tz={tz}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  )
}

/** A coach's week (working hours Monday to Sunday) and their free times on the day picked */
function ScheduleDialog({
  coach,
  day,
  slots,
  tz,
  onClose,
}: {
  coach: PublicCoach
  day: string
  slots: CoachAvailability["slots"]
  tz: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  // Monday first
  const week = [1, 2, 3, 4, 5, 6, 0]
  const hours = coach.hours ?? []
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{coach.name}</DialogTitle>
          {coach.bio && <DialogDescription>{coach.bio}</DialogDescription>}
        </DialogHeader>
        <section className="space-y-1.5">
          <h4 className="text-sm font-semibold">
            {t("public.coachDay.freeOn", { day })}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {freeRanges(slots).map(([a, b]) => (
              <span
                key={a}
                className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-sm tabular-nums"
              >
                {timeIn(a, tz)}–{timeIn(b, tz)}
              </span>
            ))}
          </div>
        </section>
        <section className="space-y-1.5">
          <h4 className="text-sm font-semibold">{t("public.coachDay.week")}</h4>
          <dl className="divide-y rounded-lg ring-1 ring-border">
            {week.map((d) => {
              const list = hours.filter((h) => h.weekday === d)
              return (
                <div
                  key={d}
                  className="flex justify-between gap-3 px-3 py-2 text-sm"
                >
                  <dt>{t(`weekday.${d}`)}</dt>
                  <dd
                    className={
                      list.length ? "tabular-nums" : "text-muted-foreground"
                    }
                  >
                    {list.length
                      ? list.map((h) => `${h.open}–${h.close}`).join(", ")
                      : t("public.coachDay.off")}
                  </dd>
                </div>
              )
            })}
          </dl>
          <p className="text-xs text-muted-foreground">
            {t("public.coachDay.weekHint")}
          </p>
        </section>
      </DialogContent>
    </Dialog>
  )
}
