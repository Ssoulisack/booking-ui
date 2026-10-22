import { addDays } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
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
import { Switch } from "@/components/ui/switch"
import type { Closure } from "@/lib/api/types"
import { dayIn, nextDays, timeIn } from "@/lib/format"

import {
  manage,
  useChange,
  useClosures,
  useCoachesList,
  useResourcesList,
  useSettings,
  useDelete,
} from "../api"
import { DeleteButton, EmptyState, FormDialog, PageHeader } from "../ui"
import { useInvalidate } from "./shared"

/** /setup/closures — holidays and maintenance: nobody can book these times */
export function ClosuresPage() {
  const { t } = useTranslation()
  const closures = useClosures()
  const settings = useSettings()
  const [adding, setAdding] = useState(false)
  const tz = settings.data?.in_force.timezone ?? "Asia/Vientiane"
  // compared as moments: the API may write times with different zone suffixes
  const [now] = useState(() => Date.now())
  const upcoming = (closures.data ?? [])
    .filter((c) => Date.parse(c.ends_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))

  return (
    <>
      <PageHeader
        title={t("setup.closures.title")}
        lead={t("setup.closures.lead")}
        actions={
          <Button className="h-11 lg:h-9" onClick={() => setAdding(true)}>
            <PlusIcon />
            {t("setup.closures.add")}
          </Button>
        }
      />
      {closures.isPending || settings.isPending ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : closures.isError ? (
        <PageError error={closures.error} onRetry={() => closures.refetch()} />
      ) : upcoming.length === 0 ? (
        <EmptyState text={t("setup.closures.empty")} />
      ) : (
        <ul className="divide-y rounded-xl bg-background ring-1 ring-border">
          {upcoming.map((c) => (
            <ClosureRow key={c.id} closure={c} tz={tz} />
          ))}
        </ul>
      )}
      {adding && <ClosureDialog tz={tz} onClose={() => setAdding(false)} />}
    </>
  )
}

function ClosureRow({ closure, tz }: { closure: Closure; tz: string }) {
  const { t } = useTranslation()
  const courts = useResourcesList().data ?? []
  const coaches = useCoachesList().data ?? []
  const invalidate = useInvalidate(["closures"])
  const [open, setOpen] = useState(false)
  const remove = useDelete(manage.deleteClosure, () => {
    setOpen(false)
    invalidate()
  })
  const what =
    closure.owner_type === "venue"
      ? t("setup.closures.wholeVenue")
      : ((closure.owner_type === "resource" ? courts : coaches).find(
          (x) => x.id === closure.owner_id,
        )?.name ?? "")
  const sameDay = dayIn(closure.starts_at, tz) === dayIn(closure.ends_at, tz)
  const when = sameDay
    ? `${dayIn(closure.starts_at, tz)}, ${timeIn(closure.starts_at, tz)}–${timeIn(closure.ends_at, tz)}`
    : `${dayIn(closure.starts_at, tz)} ${timeIn(closure.starts_at, tz)} – ${dayIn(closure.ends_at, tz)} ${timeIn(closure.ends_at, tz)}`

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <div className="min-h-12 min-w-0 flex-1 py-1">
        <p className="font-medium">
          {closure.reason || t("setup.closures.closed")}
        </p>
        <p className="text-sm text-muted-foreground">
          {what} · {when}
        </p>
      </div>
      <DeleteButton
        what={closure.reason || t("setup.closures.closed")}
        open={open}
        onOpenChange={setOpen}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(closure.id)}
      />
    </li>
  )
}

function ClosureDialog({ tz, onClose }: { tz: string; onClose: () => void }) {
  const { t } = useTranslation()
  const courts = useResourcesList().data ?? []
  const coaches = useCoachesList().data ?? []
  const today = nextDays(tz, 1)[0]
  const [target, setTarget] = useState("venue:0")
  const [allDay, setAllDay] = useState(true)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [start, setStart] = useState("08:00")
  const [end, setEnd] = useState("12:00")
  const [reason, setReason] = useState("")
  const save = useChange(manage.saveClosure, ["closures"])
  const input = "h-11 text-base lg:h-9 lg:text-sm"

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const [owner_type, owner_id] = target.split(":")
    // all day: from the start of the first day to the start of the day after the last
    const startsAt = fromZonedTime(`${from}T${allDay ? "00:00" : start}:00`, tz)
    const endsAt = allDay
      ? fromZonedTime(
          `${formatInTimeZone(addDays(fromZonedTime(`${to}T12:00:00`, tz), 1), tz, "yyyy-MM-dd")}T00:00:00`,
          tz,
        )
      : fromZonedTime(`${to}T${end}:00`, tz)
    save.mutate(
      {
        owner_type: owner_type as Closure["owner_type"],
        owner_id: Number(owner_id),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        reason: reason.trim(),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("setup.closures.add")}
      description={t("setup.closures.dialogLead")}
      submitLabel={t("dash.save")}
      pending={save.isPending}
      error={save.error}
      onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="closure-target">{t("setup.closures.what")}</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger id="closure-target" className="h-11 w-full lg:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="venue:0">
                {t("setup.closures.wholeVenue")}
              </SelectItem>
              {courts.map((c) => (
                <SelectItem key={`r${c.id}`} value={`resource:${c.id}`}>
                  {c.name}
                </SelectItem>
              ))}
              {coaches.map((c) => (
                <SelectItem key={`c${c.id}`} value={`coach:${c.id}`}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 sm:col-span-2">
          <Label htmlFor="closure-allday">{t("setup.closures.allDay")}</Label>
          <Switch
            id="closure-allday"
            checked={allDay}
            onCheckedChange={setAllDay}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="closure-from">{t("setup.closures.from")}</Label>
          <Input
            id="closure-from"
            type="date"
            min={today}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              if (to < e.target.value) setTo(e.target.value)
            }}
            className={input}
          />
          {!allDay && (
            <Input
              type="time"
              step={1800}
              aria-label={t("setup.classes.start")}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={input}
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="closure-to">{t("setup.closures.to")}</Label>
          <Input
            id="closure-to"
            type="date"
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={input}
          />
          {!allDay && (
            <Input
              type="time"
              step={1800}
              aria-label={t("setup.classes.end")}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={input}
            />
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="closure-reason">{t("setup.closures.reason")}</Label>
          <Input
            id="closure-reason"
            value={reason}
            maxLength={255}
            placeholder={t("setup.closures.reasonPlaceholder")}
            onChange={(e) => setReason(e.target.value)}
            className={input}
          />
        </div>
      </div>
    </FormDialog>
  )
}
