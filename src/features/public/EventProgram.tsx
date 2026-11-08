import { ClockIcon, MapPinIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { LineupItem } from "@/types/event"

import { eventTimes, lineupFor } from "./event-program"

/** "Tonight 19:00 – 01:00 · Floor 1": when the event runs and where (nothing to say: nothing shown) */
export function EventWhen({
  start,
  end,
  areas,
  className,
}: {
  start: string
  end: string
  areas: Array<{ id: number; name: string }>
  className?: string
}) {
  const { t } = useTranslation()
  const time = eventTimes(start, end)
  if (!time && areas.length === 0) return null
  return (
    <p
      className={
        className ?? "flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
      }
    >
      {time && (
        <span className="inline-flex items-center gap-1.5 font-medium">
          <ClockIcon className="size-4" aria-hidden />
          {time}
        </span>
      )}
      {areas.length > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <MapPinIcon className="size-4" aria-hidden />
          {t("public.events.heldIn", {
            areas: areas.map((a) => a.name).join(", "),
          })}
        </span>
      )}
    </p>
  )
}

/** The lineup of one day: a line per act, "19:00 – 20:30  Brand show" ("23:00 – until the end  DJ") */
export function EventLineup({
  lineup,
  day,
}: {
  lineup: LineupItem[]
  day?: string
}) {
  const { t } = useTranslation()
  const rows = lineupFor(lineup, day)
  if (rows.length === 0) return null
  return (
    <section aria-label={t("public.events.lineup")} className="space-y-2">
      <h3 className="font-semibold">{t("public.events.lineup")}</h3>
      <ol className="divide-y rounded-xl bg-card ring-1 ring-border">
        {rows.map((r, i) => (
          <li key={i} className="flex gap-4 px-4 py-2.5">
            <span className="w-32 shrink-0 text-sm font-medium tabular-nums">
              {r.start_time} – {r.end_time || t("public.events.untilEnd")}
            </span>
            <span className="min-w-0 break-words">{r.title}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
