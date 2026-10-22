import { CopyIcon, PlusIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import type { OpeningHour, ScheduleOwner } from "@/lib/api/types"

import { manage, useChange, useOpeningHours } from "../api"
import { Panel } from "../ui"
import { WEEK } from "./shared"

type Week = Record<number, Array<{ open: string; close: string }>>

const toWeek = (hours: OpeningHour[]): Week => {
  const week: Week = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  for (const h of hours) week[h.weekday].push({ open: h.open, close: h.close })
  for (const d of WEEK) week[d].sort((a, b) => a.open.localeCompare(b.open))
  return week
}

const toHours = (week: Week): OpeningHour[] =>
  WEEK.flatMap((weekday) => week[weekday].map((i) => ({ weekday, ...i })))

/** Weekly opening hours of a court or coach: one or more open times per day */
export function HoursEditor({
  owner,
  id,
}: {
  owner: ScheduleOwner
  id: number
}) {
  const hours = useOpeningHours(owner, id)
  if (hours.isPending) return <Skeleton className="h-80 rounded-xl" />
  if (hours.isError) return <ErrorAlert error={hours.error} />
  return <WeekForm owner={owner} id={id} initial={toWeek(hours.data)} />
}

function WeekForm({
  owner,
  id,
  initial,
}: {
  owner: ScheduleOwner
  id: number
  initial: Week
}) {
  const { t } = useTranslation()
  const [week, setWeek] = useState<Week>(initial)
  const [dirty, setDirty] = useState(false)
  const save = useChange(manage.saveHours, ["hours"])

  const update = (fn: (w: Week) => void) => {
    const next: Week = structuredClone(week)
    fn(next)
    setWeek(next)
    setDirty(true)
  }
  const openDays = WEEK.filter((d) => week[d].length > 0).length

  return (
    <Panel
      title={t("setup.hours.title")}
      lead={
        openDays === 0
          ? t("setup.hours.neverOpen")
          : t("setup.hours.lead", { count: openDays })
      }
      actions={
        <Button
          type="button"
          variant="outline"
          className="h-11 lg:h-9"
          disabled={week[1].length === 0}
          onClick={() =>
            update((w) => {
              for (const d of WEEK) w[d] = structuredClone(w[1])
            })
          }
        >
          <CopyIcon />
          {t("setup.hours.copyMonday")}
        </Button>
      }
    >
      <ul className="divide-y">
        {WEEK.map((day) => {
          const open = week[day].length > 0
          return (
            <li key={day} className="flex flex-wrap items-start gap-3 py-3">
              <div className="flex w-36 items-center gap-3 pt-2">
                <Switch
                  id={`day-${day}`}
                  checked={open}
                  aria-label={t(`weekday.${day}`)}
                  onCheckedChange={(on) =>
                    update((w) => {
                      w[day] = on ? [{ open: "08:00", close: "22:00" }] : []
                    })
                  }
                />
                <label htmlFor={`day-${day}`} className="font-medium">
                  {t(`weekday.${day}`)}
                </label>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {!open && (
                  <p className="pt-2.5 text-sm text-muted-foreground">
                    {t("setup.hours.closed")}
                  </p>
                )}
                {week[day].map((interval, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Input
                      type="time"
                      step={1800}
                      aria-label={t("setup.hours.opens")}
                      value={interval.open}
                      onChange={(e) =>
                        update((w) => {
                          w[day][i].open = e.target.value
                        })
                      }
                      className="h-11 w-32 lg:h-9"
                    />
                    <span aria-hidden>–</span>
                    <Input
                      type="time"
                      step={1800}
                      aria-label={t("setup.hours.closes")}
                      value={interval.close}
                      onChange={(e) =>
                        update((w) => {
                          w[day][i].close = e.target.value
                        })
                      }
                      className="h-11 w-32 lg:h-9"
                    />
                    {week[day].length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        className="size-11 lg:size-9"
                        aria-label={t("setup.hours.removeTime")}
                        onClick={() =>
                          update((w) => {
                            w[day].splice(i, 1)
                          })
                        }
                      >
                        <XIcon />
                      </Button>
                    )}
                  </div>
                ))}
                {open && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 w-fit px-2 lg:h-9"
                    onClick={() =>
                      update((w) => {
                        const last = w[day][w[day].length - 1]
                        w[day].push({
                          open: last?.close ?? "08:00",
                          close: "22:00",
                        })
                      })
                    }
                  >
                    <PlusIcon />
                    {t("setup.hours.addTime")}
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-4 space-y-3">
        <ErrorAlert error={save.error} />
        <Button
          className="h-11 lg:h-9"
          disabled={!dirty || save.isPending}
          onClick={() =>
            save.mutate(
              { owner, id, hours: toHours(week) },
              {
                onSuccess: () => {
                  setDirty(false)
                  toast.success(t("setup.hours.saved"))
                },
              },
            )
          }
        >
          {save.isPending && <Spinner />}
          {t("setup.hours.save")}
        </Button>
      </div>
    </Panel>
  )
}
