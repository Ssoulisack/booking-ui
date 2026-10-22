import { CheckCircle2Icon, SearchIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
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
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { Booking, StaffBookingInput } from "@/lib/api/types"
import { money, timeIn } from "@/lib/format"
import { displayPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"

import {
  useClassList,
  useCoachesList,
  useResourcesList,
  useSettings,
  useSportsList,
} from "../api"
import { FormDialog } from "../ui"
import { lengthsOf } from "@/components/booking/lengths"
import { TimePicker } from "@/components/booking/TimePicker"
import {
  useCreateDeskBooking,
  useDeskAvailability,
  useFindCustomer,
} from "./api"

type What = "court" | "coach" | "class"

export interface NewBookingStart {
  date: string
  resource_id?: number
  coach_id?: number
}

/** Walk-in or phone booking: who, what, when — staff rules apply (earlier today is allowed) */
export function NewBookingDialog({
  start,
  onClose,
  onCreated,
}: {
  start: NewBookingStart
  onClose: () => void
  onCreated: (b: Booking) => void
}) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  // hidden sports are not offered (the backend refuses their free times)
  const sports = (useSportsList().data ?? []).filter((s) => s.active)
  const courts = useResourcesList().data ?? []
  const coaches = useCoachesList().data ?? []
  const create = useCreateDeskBooking()

  const startCourt = courts.find((c) => c.id === start.resource_id)
  const startCoach = coaches.find((c) => c.id === start.coach_id)
  const [who, setWho] = useState<"walkin" | "account">("walkin")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [lookup, setLookup] = useState("")
  const find = useFindCustomer()
  const account = find.data
  const [what, setWhat] = useState<What>(
    startCoach && !startCourt ? "coach" : "court",
  )
  const [sportId, setSportId] = useState<number | undefined>(
    startCourt?.sport_id ?? startCoach?.sports[0]?.id ?? sports[0]?.id,
  )
  const [courtId, setCourtId] = useState<number | undefined>(startCourt?.id)
  const [coachId, setCoachId] = useState<number | undefined>(startCoach?.id)
  const [date, setDate] = useState(start.date)
  const [slot, setSlot] = useState<string>()
  const [length, setLength] = useState<number>()
  const [classId, setClassId] = useState<number>()
  const [seats, setSeats] = useState("1")
  const [notes, setNotes] = useState("")
  const [missing, setMissing] = useState(false)

  const sid = sportId ?? sports[0]?.id // the sports list may arrive after the dialog opened
  const sportCourts = courts.filter((c) => c.sport_id === sid && c.active)
  const sportCoaches = coaches.filter(
    (c) => c.active && c.sports.some((s) => s.id === sid),
  )
  const court =
    what === "court"
      ? (sportCourts.find((c) => c.id === courtId) ?? sportCourts[0])
      : undefined
  const coach =
    what === "coach"
      ? (sportCoaches.find((c) => c.id === coachId) ?? sportCoaches[0])
      : what === "court"
        ? sportCoaches.find((c) => c.id === coachId)
        : undefined

  const availability = useDeskAvailability(
    what !== "class" && (court || coach)
      ? { date, resource_id: court?.id, coach_id: coach?.id, sport_id: sid }
      : null,
  )
  const classes = useClassList(date, date)
  const dayClasses = (classes.data ?? []).filter((c) => c.sport_id === sid)
  // length first (the shortest by default), then a start that allows it
  const lengths = availability.data ? lengthsOf(availability.data) : []
  const len = length && lengths.includes(length) ? length : lengths[0]
  const chosen = availability.data?.slots.find(
    (s) => s.starts_at === slot && s.durations_min.includes(len),
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const whoOk = who === "walkin" ? name.trim() && phone.trim() : account
    const whatOk = what === "class" ? !!classId : !!(chosen && len)
    if (!whoOk || !whatOk) {
      setMissing(true)
      return
    }
    const body: StaffBookingInput =
      what === "class"
        ? { class_session_id: classId, seats: Number(seats) || 1 }
        : {
            resource_id: court?.id,
            coach_id: coach?.id,
            sport_id: sid,
            starts_at: chosen!.starts_at,
            duration_min: len,
          }
    if (who === "walkin")
      body.guest = { name: name.trim(), phone: phone.trim() }
    else body.customer = account!.member_no
    if (notes.trim()) body.notes = notes.trim()
    create.mutate(body, {
      onSuccess: (b) => {
        toast.success(t("desk.created", { code: b.code }))
        onCreated(b)
      },
    })
  }

  const input = "h-11 text-base lg:h-9 lg:text-sm"
  const resetTime = () => {
    setSlot(undefined)
    setLength(undefined)
  }

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("desk.newBooking")}
      description={t("desk.newBookingLead")}
      submitLabel={t("desk.book")}
      pending={create.isPending}
      error={create.error}
      onSubmit={submit}
    >
      <div className="space-y-5">
        <Segmented
          label={t("desk.who")}
          value={who}
          onChange={setWho}
          options={[
            { value: "walkin", label: t("desk.walkIn") },
            { value: "account", label: t("desk.hasAccount") },
          ]}
        />
        {who === "walkin" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="nb-name" label={t("fields.name")}>
              <Input
                id="nb-name"
                value={name}
                aria-invalid={(missing && !name.trim()) || undefined}
                onChange={(e) => setName(e.target.value)}
                className={input}
              />
            </Field>
            <Field id="nb-phone" label={t("public.phone")}>
              <Input
                id="nb-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                aria-invalid={(missing && !phone.trim()) || undefined}
                onChange={(e) => setPhone(e.target.value)}
                className={input}
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-2">
            <Field id="nb-account" label={t("desk.findAccount")}>
              <div className="flex gap-2">
                <Input
                  id="nb-account"
                  value={lookup}
                  placeholder={t("desk.findPlaceholder")}
                  aria-invalid={(missing && !account) || undefined}
                  onChange={(e) => {
                    setLookup(e.target.value)
                    find.reset()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (lookup.trim()) find.mutate(lookup.trim())
                    }
                  }}
                  className={input}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 lg:h-9"
                  disabled={!lookup.trim() || find.isPending}
                  onClick={() => find.mutate(lookup.trim())}
                >
                  {find.isPending ? <Spinner /> : <SearchIcon />}
                  {t("desk.find")}
                </Button>
              </div>
            </Field>
            {account ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm">
                <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600" />
                <span>
                  <span className="block font-medium">{account.name}</span>
                  <span className="text-muted-foreground">
                    {[
                      account.member_no,
                      account.phone && displayPhone(account.phone),
                      account.email,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </div>
            ) : (
              <ErrorAlert error={find.error} />
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="nb-sport" label={t("setup.sport")}>
            <Select
              value={sid ? String(sid) : ""}
              onValueChange={(v) => {
                setSportId(Number(v))
                setCourtId(undefined)
                setCoachId(undefined)
                setClassId(undefined)
                resetTime()
              }}
            >
              <SelectTrigger id="nb-sport" className="h-11 w-full lg:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sports.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="nb-date" label={t("setup.classes.date")}>
            <Input
              id="nb-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                resetTime()
                setClassId(undefined)
              }}
              className={input}
            />
          </Field>
        </div>

        <Segmented
          label={t("desk.what")}
          value={what}
          onChange={(v) => {
            setWhat(v)
            resetTime()
          }}
          options={[
            { value: "court", label: t("public.what.court") },
            { value: "coach", label: t("public.what.coach") },
            { value: "class", label: t("public.what.class") },
          ]}
        />

        {what !== "class" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {what === "court" && (
              <Field id="nb-court" label={t("setup.tabs.courts")}>
                <Select
                  value={court ? String(court.id) : ""}
                  onValueChange={(v) => {
                    setCourtId(Number(v))
                    resetTime()
                  }}
                >
                  <SelectTrigger id="nb-court" className="h-11 w-full lg:h-9">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {sportCourts.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field
              id="nb-coach"
              label={
                what === "court"
                  ? t("setup.classes.coach")
                  : t("setup.tabs.coaches")
              }
            >
              <Select
                value={coach ? String(coach.id) : "none"}
                onValueChange={(v) => {
                  setCoachId(v === "none" ? undefined : Number(v))
                  resetTime()
                }}
              >
                <SelectTrigger id="nb-coach" className="h-11 w-full lg:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {what === "court" && (
                    <SelectItem value="none">
                      {t("setup.classes.none")}
                    </SelectItem>
                  )}
                  {sportCoaches.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        {what === "class" ? (
          classes.isPending ? (
            <Skeleton className="h-20" />
          ) : dayClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("public.noClasses")}
            </p>
          ) : (
            <div className="space-y-2">
              <div
                role="radiogroup"
                aria-label={t("public.step.class")}
                className="grid gap-2"
              >
                {dayClasses.map((c) => (
                  <Choice
                    key={c.id}
                    selected={c.id === classId}
                    onSelect={() => setClassId(c.id)}
                  >
                    <span className="font-medium tabular-nums">
                      {timeIn(c.starts_at, tz)}–{timeIn(c.ends_at, tz)}
                    </span>{" "}
                    {c.title} · {money(c.price, c.currency)}
                  </Choice>
                ))}
              </div>
              <Field id="nb-seats" label={t("public.seats")}>
                <Input
                  id="nb-seats"
                  inputMode="numeric"
                  value={seats}
                  onChange={(e) =>
                    setSeats(e.target.value.replace(/[^\d]/g, ""))
                  }
                  className={`${input} w-24`}
                />
              </Field>
            </div>
          )
        ) : !court && !coach ? (
          <p className="text-sm text-muted-foreground">
            {t("desk.pickCourtOrCoach")}
          </p>
        ) : availability.isError ? (
          <ErrorAlert error={availability.error} />
        ) : !availability.data ? (
          <Skeleton className="h-24" />
        ) : availability.data.slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("public.noTimes")}</p>
        ) : (
          <div className={cn(availability.isPlaceholderData && "opacity-60")}>
            <TimePicker
              tone="primary"
              availability={availability.data}
              tz={tz}
              start={slot}
              length={length}
              disabled={availability.isPlaceholderData}
              onChange={(start, l) => {
                setSlot(start)
                setLength(l)
              }}
            />
          </div>
        )}

        <Field id="nb-notes" label={t("public.notes")}>
          <Textarea
            id="nb-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        {missing && (
          <p className="text-sm text-destructive">{t("desk.fillIn")}</p>
        )}
      </div>
    </FormDialog>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-lg bg-muted p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-10 flex-1 rounded-md px-2 text-sm font-medium transition-colors lg:h-8",
            o.value === value
              ? "bg-background shadow-sm"
              : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Choice({
  selected,
  onSelect,
  disabled,
  compact,
  children,
}: {
  selected: boolean
  onSelect: () => void
  disabled?: boolean
  compact?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "rounded-lg border text-sm transition-colors",
        compact ? "h-11 px-3 lg:h-9" : "min-h-11 px-3 py-2 text-left",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}
