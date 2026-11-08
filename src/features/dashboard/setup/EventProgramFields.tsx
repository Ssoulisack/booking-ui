import { PlusIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { TimeInput } from "@/components/global/time-input"
import { Label } from "@/components/ui/label"
import type { LineupItem } from "@/types/event"

const input = "h-11 text-base lg:h-9 lg:text-sm"

/** Start and end time of the event, each day (both optional) */
export function TimeFields({
  start,
  end,
  onStart,
  onEnd,
}: {
  start: string
  end: string
  onStart: (v: string) => void
  onEnd: (v: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ev-time-start">{t("events.startTime")}</Label>
          <TimeInput
            id="ev-time-start"
            label={t("events.startTime")}
            value={start}
            onChange={(v) => onStart(v)}
            clearable
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-time-end">{t("events.endTime")}</Label>
          <TimeInput
            id="ev-time-end"
            label={t("events.endTime")}
            value={end}
            onChange={(v) => onEnd(v)}
            clearable
            disabled={!start}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{t("events.timeHint")}</p>
    </div>
  )
}

/** Which areas (floors, halls) the event is held in; none ticked = the whole branch */
export function AreaPicker({
  areas,
  value,
  onChange,
}: {
  areas: Array<{ id: number; name: string }>
  value: number[]
  onChange: (ids: number[]) => void
}) {
  const { t } = useTranslation()
  if (areas.length < 2) return null // one area: the event is held there, nothing to choose
  const toggle = (id: number) =>
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    )
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("events.areasTitle")}</legend>
      <div className="flex flex-wrap gap-2">
        {areas.map((a) => (
          <label
            key={a.id}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm lg:min-h-9"
          >
            <Checkbox
              checked={value.includes(a.id)}
              onCheckedChange={() => toggle(a.id)}
            />
            {a.name}
          </label>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {value.length === 0 ? t("events.areasAll") : t("events.areasSome")}
      </p>
    </fieldset>
  )
}

/** The program: lines of "from – to  what happens", each for every day or one day of the event */
export function LineupEditor({
  rows,
  days,
  onChange,
}: {
  rows: LineupItem[]
  /** the event's days, when it lasts several (a line can belong to one of them) */
  days: string[]
  onChange: (rows: LineupItem[]) => void
}) {
  const { t } = useTranslation()
  const set = (i: number, patch: Partial<LineupItem>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("events.lineupTitle")}</legend>
      <p className="text-sm text-muted-foreground">{t("events.lineupHint")}</p>
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("events.noLineup")}</p>
      )}
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li
            key={i}
            className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-lg border p-2 sm:grid-cols-[7rem_7rem_1fr_auto]"
          >
            <div className="space-y-1">
              <Label className="text-xs">{t("events.rowStart")}</Label>
              <TimeInput
                label={t("events.rowStart")}
                value={r.start_time}
                onChange={(v) => set(i, { start_time: v })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("events.rowEnd")}</Label>
              <TimeInput
                label={t("events.rowEnd")}
                value={r.end_time}
                onChange={(v) => set(i, { end_time: v })}
                clearable
              />
            </div>
            <div className="order-last col-span-3 space-y-1 sm:order-none sm:col-span-1">
              <Label className="text-xs">{t("events.rowTitle")}</Label>
              <Input
                aria-label={t("events.rowTitle")}
                value={r.title}
                maxLength={120}
                onChange={(e) => set(i, { title: e.target.value })}
                className={input}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 lg:size-9"
              aria-label={t("events.removeRow")}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            >
              <Trash2Icon />
            </Button>
            {days.length > 1 && (
              <div className="col-span-3 space-y-1 sm:col-span-4">
                <Label className="text-xs">{t("events.rowDay")}</Label>
                <select
                  aria-label={t("events.rowDay")}
                  value={r.day}
                  onChange={(e) => set(i, { day: e.target.value })}
                  className="h-11 w-full rounded-md border bg-background px-2 text-base lg:h-9 lg:text-sm"
                >
                  <option value="">{t("events.everyDay")}</option>
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        className="h-11 lg:h-9"
        onClick={() =>
          onChange([
            ...rows,
            { day: "", start_time: "", end_time: "", title: "" },
          ])
        }
      >
        <PlusIcon />
        {t("events.addRow")}
      </Button>
    </fieldset>
  )
}
