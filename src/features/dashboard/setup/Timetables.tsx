import { RepeatIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { PageError } from "@/components/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Timetable } from "@/lib/api/types"
import { dayIn, middayOf, money } from "@/lib/format"

import {
  manage,
  useCoachesList,
  useDelete,
  useResourcesList,
  useSportsList,
  useTimetables,
} from "../api"
import { DeleteButton, Panel } from "../ui"
import { useInvalidate, weekdayText } from "./shared"

/** Setup › Classes: the weekly classes that keep making their classes 60 days ahead */
export function TimetablePanel({
  tz,
  onEdit,
}: {
  tz: string
  onEdit: (t: Timetable) => void
}) {
  const { t } = useTranslation()
  const timetables = useTimetables()
  if (timetables.isPending) return <Skeleton className="h-24 rounded-xl" />
  if (timetables.isError)
    return (
      <PageError
        error={timetables.error}
        onRetry={() => timetables.refetch()}
      />
    )
  if (timetables.data.length === 0) return null
  return (
    <Panel
      title={t("setup.classes.weeklyTitle")}
      lead={t("setup.classes.weeklyPanelLead")}
    >
      <ul className="divide-y">
        {timetables.data.map((tt) => (
          <TimetableRow key={tt.id} tt={tt} tz={tz} onEdit={() => onEdit(tt)} />
        ))}
      </ul>
    </Panel>
  )
}

function TimetableRow({
  tt,
  tz,
  onEdit,
}: {
  tt: Timetable
  tz: string
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const sports = useSportsList().data ?? []
  const coaches = useCoachesList().data ?? []
  const spaces = useResourcesList().data ?? []
  const invalidate = useInvalidate(["timetables", "classes"])
  const [open, setOpen] = useState(false)
  const stop = useDelete(manage.stopTimetable, () => undefined)
  const day = (ymd: string) => dayIn(middayOf(ymd, tz), tz)

  const details = [
    sports.find((s) => s.id === tt.sport_id)?.name,
    spaces.find((s) => s.id === tt.resource_id)?.name,
    coaches.find((c) => c.id === tt.coach_id)?.name,
    t("setup.classes.seats", { count: tt.capacity }),
    money(tt.price, tt.currency),
  ].filter(Boolean)

  return (
    <li className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
      <RepeatIcon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {tt.title}
          {!tt.active && <Badge variant="secondary">{t("dash.hidden")}</Badge>}
        </p>
        <p className="text-sm">
          {weekdayText(tt.weekdays, (d) => t(`weekdayShort.${d}`))}{" "}
          <span className="tabular-nums">
            {tt.start_time}–{tt.end_time}
          </span>
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {details.join(" · ")}
        </p>
        <p className="text-sm text-muted-foreground">
          {tt.ends_on
            ? t("setup.classes.fromTo", {
                from: day(tt.starts_on),
                to: day(tt.ends_on),
              })
            : t("setup.classes.fromNoEnd", { from: day(tt.starts_on) })}
        </p>
      </div>
      <Button variant="outline" className="h-11 lg:h-9" onClick={onEdit}>
        {t("dash.edit")}
      </Button>
      <DeleteButton
        what={tt.title}
        label={t("setup.classes.stop")}
        title={t("setup.classes.stopTitle", { title: tt.title })}
        description={t("setup.classes.stopLead")}
        open={open}
        onOpenChange={setOpen}
        pending={stop.isPending}
        error={stop.error}
        onConfirm={() =>
          stop.mutate(tt.id, {
            onSuccess: (res) => {
              const r = res as { removed: number; kept_booked: number }
              setOpen(false)
              invalidate()
              toast.success(
                t("setup.classes.stopped", { count: r.removed }),
                r.kept_booked
                  ? {
                      description: t("setup.classes.keptBooked", {
                        count: r.kept_booked,
                      }),
                    }
                  : undefined,
              )
            },
          })
        }
      />
    </li>
  )
}
