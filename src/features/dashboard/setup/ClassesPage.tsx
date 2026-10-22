import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { CalendarPlusIcon, PlusIcon, RepeatIcon } from "lucide-react"
import { fromZonedTime } from "date-fns-tz"
import { toast } from "sonner"

import { PageError } from "@/components/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { BranchSettings, ClassSession, Timetable } from "@/lib/api/types"
import { dayIn, money, nextDays, timeIn } from "@/lib/format"

import {
  manage,
  useChange,
  useClassList,
  useCoachesList,
  useResourcesList,
  useSettings,
  useSportsList,
  useDelete,
} from "../api"
import { DeleteButton, EmptyState, FormDialog, PageHeader } from "../ui"
import { useInvalidate, WEEK } from "./shared"
import { TimetablePanel } from "./Timetables"

const RANGE_DAYS = 31

/**
 * /setup/classes — weekly classes (made automatically 60 days ahead) and the classes of the next
 * month: add one, add a weekly class, edit, delete
 */
export function ClassesPage() {
  const { t } = useTranslation()
  const settings = useSettings()
  const tz = settings.data?.in_force.timezone ?? "Asia/Vientiane"
  const days = useMemo(() => nextDays(tz, RANGE_DAYS), [tz])
  const classes = useClassList(days[0], days[days.length - 1])
  const sports = useSportsList()
  const [dialog, setDialog] = useState<
    "one" | "weekly" | ClassSession | { timetable: Timetable } | null
  >(null)
  const noSports = sports.data?.length === 0

  const byDay = new Map<string, ClassSession[]>()
  for (const c of classes.data ?? []) {
    const d = dayIn(c.starts_at, tz)
    byDay.set(d, [...(byDay.get(d) ?? []), c])
  }

  return (
    <>
      <PageHeader
        title={t("setup.classes.title")}
        lead={t("setup.classes.lead")}
        actions={
          <>
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              disabled={noSports}
              onClick={() => setDialog("weekly")}
            >
              <RepeatIcon />
              {t("setup.classes.addWeekly")}
            </Button>
            <Button
              className="h-11 lg:h-9"
              disabled={noSports}
              onClick={() => setDialog("one")}
            >
              <PlusIcon />
              {t("setup.classes.addOne")}
            </Button>
          </>
        }
      />
      <div className="mb-6">
        <TimetablePanel
          tz={tz}
          onEdit={(timetable) => setDialog({ timetable })}
        />
      </div>
      {classes.isPending || settings.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : classes.isError ? (
        <PageError error={classes.error} onRetry={() => classes.refetch()} />
      ) : byDay.size === 0 ? (
        <EmptyState text={t("setup.classes.empty")} />
      ) : (
        <div className="space-y-5">
          {[...byDay.entries()].map(([day, list]) => (
            <section key={day} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {day}
              </h2>
              <ul className="divide-y rounded-xl bg-background ring-1 ring-border">
                {list.map((c) => (
                  <ClassRow
                    key={c.id}
                    cls={c}
                    tz={tz}
                    onEdit={() => setDialog(c)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {dialog && settings.data && (
        <ClassDialog
          mode={
            dialog === "weekly" ||
            (typeof dialog === "object" && "timetable" in dialog)
              ? "weekly"
              : "one"
          }
          cls={
            typeof dialog === "object" && !("timetable" in dialog)
              ? dialog
              : undefined
          }
          timetable={
            typeof dialog === "object" && "timetable" in dialog
              ? dialog.timetable
              : undefined
          }
          settings={settings.data}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}

function ClassRow({
  cls,
  tz,
  onEdit,
}: {
  cls: ClassSession
  tz: string
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const sports = useSportsList().data ?? []
  const coaches = useCoachesList().data ?? []
  const courts = useResourcesList().data ?? []
  const invalidate = useInvalidate(["classes"])
  const [open, setOpen] = useState(false)
  const remove = useDelete(manage.deleteClass, () => {
    setOpen(false)
    invalidate()
  })
  const details = [
    sports.find((s) => s.id === cls.sport_id)?.name,
    coaches.find((c) => c.id === cls.coach_id)?.name,
    courts.find((c) => c.id === cls.resource_id)?.name,
  ].filter(Boolean)

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2 sm:flex-nowrap">
      <span className="w-28 shrink-0 font-medium tabular-nums">
        {timeIn(cls.starts_at, tz)}–{timeIn(cls.ends_at, tz)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {cls.title}{" "}
          {cls.timetable_id && (
            <Badge variant="outline">{t("setup.classes.weeklyBadge")}</Badge>
          )}{" "}
          {cls.active === false && (
            <Badge variant="secondary">{t("dash.hidden")}</Badge>
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {[
            ...details,
            t("setup.classes.seats", { count: cls.capacity }),
            money(cls.price, cls.currency),
          ].join(" · ")}
        </p>
      </div>
      <Button variant="outline" className="h-11 lg:h-9" onClick={onEdit}>
        {t("dash.edit")}
      </Button>
      <DeleteButton
        what={cls.title}
        open={open}
        onOpenChange={setOpen}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(cls.id)}
      />
    </li>
  )
}

interface FormState {
  sport_id: string
  title: string
  coach_id: string
  resource_id: string
  date: string
  start: string
  end: string
  capacity: string
  price: string
  weekdays: number[]
  starts_on: string
  /** "" = no end */
  ends_on: string
  no_end: boolean
}

function ClassDialog({
  mode,
  cls,
  timetable: tt,
  settings,
  onClose,
}: {
  mode: "one" | "weekly"
  cls?: ClassSession
  /** editing a weekly class */
  timetable?: Timetable
  settings: BranchSettings
  onClose: () => void
}) {
  const { t } = useTranslation()
  const tz = settings.in_force.timezone
  const sports = useSportsList().data ?? []
  const coaches = useCoachesList().data ?? []
  const courts = useResourcesList().data ?? []
  const today = nextDays(tz, 1)[0]
  const from = cls ?? tt
  const [f, setF] = useState<FormState>(() => ({
    sport_id: String(from?.sport_id ?? sports[0]?.id ?? ""),
    title: from?.title ?? "",
    coach_id: from?.coach_id ? String(from.coach_id) : "none",
    resource_id: from?.resource_id ? String(from.resource_id) : "none",
    date: cls ? dayKey(cls.starts_at, tz) : today,
    start: cls ? timeIn(cls.starts_at, tz) : (tt?.start_time ?? "18:00"),
    end: cls ? timeIn(cls.ends_at, tz) : (tt?.end_time ?? "19:00"),
    capacity: String(from?.capacity ?? 10),
    price: String(from?.price ?? ""),
    weekdays: tt?.weekdays ?? [1, 2, 3, 4, 5, 6],
    starts_on: tt?.starts_on ?? today,
    ends_on: tt?.ends_on || nextDays(tz, 28)[27],
    no_end: tt ? !tt.ends_on : true,
  }))
  const set = (patch: Partial<FormState>) => setF({ ...f, ...patch })
  const [missing, setMissing] = useState(false)

  const single = useChange(manage.saveClass, ["classes"])
  const weekly = useChange(manage.saveTimetable, ["classes", "timetables"])
  const pending = single.isPending || weekly.isPending
  const sportId = Number(f.sport_id)
  const sportCoaches = coaches.filter((c) =>
    c.sports.some((s) => s.id === sportId),
  )
  const sportCourts = courts.filter((c) => c.sport_id === sportId)

  const common = {
    sport_id: sportId,
    title: f.title.trim(),
    coach_id: f.coach_id === "none" ? null : Number(f.coach_id),
    resource_id: f.resource_id === "none" ? null : Number(f.resource_id),
    capacity: Number(f.capacity),
    price: Number(f.price || 0),
    currency: settings.in_force.currency,
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !common.title ||
      !f.capacity ||
      (mode === "weekly" && f.weekdays.length === 0)
    ) {
      setMissing(true)
      return
    }
    if (mode === "weekly") {
      weekly.mutate(
        {
          id: tt?.id,
          ...common,
          start_time: f.start,
          end_time: f.end,
          weekdays: f.weekdays,
          starts_on: f.starts_on,
          ends_on: f.no_end ? "" : f.ends_on,
          active: tt?.active ?? true,
        },
        {
          onSuccess: (res) => {
            const closed = res.skipped.filter((d) => d.reason === "closed")
            const taken = res.skipped.filter((d) => d.reason === "taken")
            const notes = [
              closed.length > 0 &&
                t("setup.classes.skipped", {
                  dates: closed.map((d) => d.date).join(", "),
                }),
              taken.length > 0 &&
                t("setup.classes.skippedTaken", {
                  dates: taken.map((d) => d.date).join(", "),
                }),
              res.kept_booked > 0 &&
                t("setup.classes.keptBooked", { count: res.kept_booked }),
            ].filter(Boolean)
            toast.success(t("setup.classes.created", { count: res.created }), {
              description: notes.length ? notes.join(" ") : undefined,
            })
            onClose()
          },
        },
      )
      return
    }
    single.mutate(
      {
        id: cls?.id,
        ...common,
        starts_at: fromZonedTime(`${f.date}T${f.start}:00`, tz).toISOString(),
        ends_at: fromZonedTime(`${f.date}T${f.end}:00`, tz).toISOString(),
        active: cls?.active ?? true,
      },
      { onSuccess: onClose },
    )
  }

  const input = "h-11 text-base lg:h-9 lg:text-sm"
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={
        cls
          ? t("setup.classes.edit")
          : tt
            ? t("setup.classes.editWeekly")
            : mode === "weekly"
              ? t("setup.classes.addWeekly")
              : t("setup.classes.addOne")
      }
      description={
        mode === "weekly"
          ? tt
            ? t("setup.classes.editWeeklyLead")
            : t("setup.classes.weeklyLead")
          : cls
            ? t("setup.classes.editLead")
            : undefined
      }
      submitLabel={t("dash.save")}
      pending={pending}
      error={single.error ?? weekly.error}
      onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cls-title">{t("setup.classes.titleField")}</Label>
          <Input
            id="cls-title"
            value={f.title}
            aria-invalid={(missing && !common.title) || undefined}
            placeholder={t("setup.classes.titlePlaceholder")}
            onChange={(e) => set({ title: e.target.value })}
            className={input}
          />
        </div>
        <Picker
          id="cls-sport"
          label={t("setup.sport")}
          value={f.sport_id}
          onChange={(v) =>
            set({ sport_id: v, coach_id: "none", resource_id: "none" })
          }
          options={sports.map((s) => ({ value: String(s.id), label: s.name }))}
        />
        <Picker
          id="cls-coach"
          label={t("setup.classes.coach")}
          value={f.coach_id}
          onChange={(v) => set({ coach_id: v })}
          options={[
            { value: "none", label: t("setup.classes.none") },
            ...sportCoaches.map((c) => ({
              value: String(c.id),
              label: c.name,
            })),
          ]}
        />
        <Picker
          id="cls-court"
          label={t("setup.classes.court")}
          value={f.resource_id}
          onChange={(v) => set({ resource_id: v })}
          options={[
            { value: "none", label: t("setup.classes.none") },
            ...sportCourts.map((c) => ({ value: String(c.id), label: c.name })),
          ]}
        />
        {mode === "one" ? (
          <div className="space-y-1.5">
            <Label htmlFor="cls-date">{t("setup.classes.date")}</Label>
            <Input
              id="cls-date"
              type="date"
              value={f.date}
              min={today}
              onChange={(e) => set({ date: e.target.value })}
              className={input}
            />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="cls-from">{t("setup.classes.startsOn")}</Label>
              <Input
                id="cls-from"
                type="date"
                value={f.starts_on}
                min={tt ? undefined : today}
                onChange={(e) => set({ starts_on: e.target.value })}
                className={input}
              />
            </div>
            <fieldset className="space-y-1.5">
              <legend className="mb-1.5 text-sm font-medium">
                {t("setup.classes.ends")}
              </legend>
              <div className="flex flex-wrap items-center gap-2">
                <Label className="flex h-11 items-center gap-2 rounded-lg border px-3 font-normal lg:h-9">
                  <Checkbox
                    checked={f.no_end}
                    onCheckedChange={(on) => set({ no_end: on === true })}
                  />
                  {t("setup.classes.noEnd")}
                </Label>
                {!f.no_end && (
                  <Input
                    id="cls-to"
                    type="date"
                    aria-label={t("setup.classes.endsOn")}
                    value={f.ends_on}
                    min={f.starts_on}
                    onChange={(e) => set({ ends_on: e.target.value })}
                    className={`${input} w-auto`}
                  />
                )}
              </div>
            </fieldset>
            <fieldset className="space-y-1.5 sm:col-span-2">
              <legend className="mb-1.5 text-sm font-medium">
                {t("setup.classes.weekdays")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {WEEK.map((d) => (
                  <Label
                    key={d}
                    className="flex h-11 items-center gap-2 rounded-lg border px-3 font-normal"
                  >
                    <Checkbox
                      checked={f.weekdays.includes(d)}
                      onCheckedChange={(on) =>
                        set({
                          weekdays: on
                            ? [...f.weekdays, d]
                            : f.weekdays.filter((x) => x !== d),
                        })
                      }
                    />
                    {t(`weekdayShort.${d}`)}
                  </Label>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cls-start">{t("setup.classes.start")}</Label>
            <Input
              id="cls-start"
              type="time"
              step={900}
              value={f.start}
              onChange={(e) => set({ start: e.target.value })}
              className={input}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cls-end">{t("setup.classes.end")}</Label>
            <Input
              id="cls-end"
              type="time"
              step={900}
              value={f.end}
              onChange={(e) => set({ end: e.target.value })}
              className={input}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cls-capacity">{t("setup.classes.capacity")}</Label>
          <Input
            id="cls-capacity"
            inputMode="numeric"
            value={f.capacity}
            aria-invalid={(missing && !f.capacity) || undefined}
            onChange={(e) =>
              set({ capacity: e.target.value.replace(/[^\d]/g, "") })
            }
            className={input}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cls-price">
            {t("setup.classes.price", { currency: settings.in_force.currency })}
          </Label>
          <Input
            id="cls-price"
            inputMode="numeric"
            value={f.price}
            onChange={(e) =>
              set({ price: e.target.value.replace(/[^\d]/g, "") })
            }
            className={input}
          />
        </div>
      </div>
      {missing && (
        <p className="text-sm text-destructive">{t("setup.classes.fillIn")}</p>
      )}
      {mode === "weekly" && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <CalendarPlusIcon className="mt-0.5 size-4 shrink-0" />
          {t("setup.classes.weeklyNote")}
        </p>
      )}
    </FormDialog>
  )
}

/** YYYY-MM-DD of a time in the business time zone */
function dayKey(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: tz })
}

function Picker({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 w-full lg:h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
