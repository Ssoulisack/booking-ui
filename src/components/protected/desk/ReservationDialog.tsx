import { useState } from "react"
import { isLaoPhone } from "@/lib/phone"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Booking } from "@/types/booking"
import { dayIn, nextDays, timeIn, todayIn } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useSettings } from "@/hooks/use-branch"
import { FormDialog } from "@/components/protected/branch/ui"
import { useDeskTableAvailability, useReserveTables } from "@/hooks/use-booking"
import { GuestsStepper, TablePicker } from "./TableDesk"

/**
 * A customer phoned: the team books their table. Day, people, a time, the tables (only the ones free then), a name and a
 * phone to call back. Confirmed at once; the tables of an event day are sold for the event, so they are not offered.
 */
export function ReservationDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (b: Booking) => void
}) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const today = todayIn(tz)
  const reserve = useReserveTables()
  const [date, setDate] = useState(today)
  const [guests, setGuests] = useState(2)
  const [startsAt, setStartsAt] = useState("")
  const [tables, setTables] = useState<number[]>([])
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const avail = useDeskTableAvailability(date, guests)
  const times = avail.data?.times ?? []
  // a bar books the evening (one time, nothing to pick); otherwise the first time is picked until the team picks another
  const time = times.find((x) => x.starts_at === startsAt) ?? times[0]
  const event = avail.data?.event
  const complete =
    !!time && tables.length > 0 && name.trim() !== "" && isLaoPhone(phone)

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("desk.reserve.title")}
      description={t("desk.reserve.lead")}
      submitLabel={t("desk.reserve.submit")}
      submitDisabled={!complete}
      pending={reserve.isPending}
      error={reserve.error}
      onSubmit={(e) => {
        e.preventDefault()
        if (!complete || !time) return
        reserve.mutate(
          {
            table_ids: tables,
            guests,
            starts_at: time.starts_at,
            guest: { name: name.trim(), phone: phone.trim() },
            notes: notes.trim() || undefined,
          },
          {
            onSuccess: (b) => {
              toast.success(t("desk.reserve.done"))
              onCreated(b)
            },
          },
        )
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rs-date">{t("desk.reserve.day")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="rs-date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                if (e.target.value) {
                  setDate(e.target.value)
                  setStartsAt("")
                  setTables([])
                }
              }}
              className="h-11 lg:h-9"
            />
          </div>
          <div className="flex gap-2">
            {nextDays(tz, 2).map((d, n) => {
              return (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={date === d ? "default" : "outline"}
                  className="h-9 lg:h-8"
                  onClick={() => {
                    setDate(d)
                    setStartsAt("")
                    setTables([])
                  }}
                >
                  {n === 0 ? t("tonight.today") : t("desk.reserve.tomorrow")}
                </Button>
              )
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t("public.tables.people")}</Label>
          <GuestsStepper
            value={guests}
            onChange={(n) => {
              setGuests(n)
              setStartsAt("")
              setTables([])
            }}
          />
        </div>
      </div>

      {event && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-400/15 dark:text-amber-100">
          {t("desk.reserve.event", { name: event.name })}
        </p>
      )}

      <div className="space-y-1.5">
        <Label>{t("desk.reserve.time")}</Label>
        {avail.isPending ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : times.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("desk.reserve.noTimes", { count: guests })}
          </p>
        ) : avail.data?.booking_style === "arrive_by" ? (
          // a bar: the evening of that day, and the time to be there by
          <p className="text-sm font-medium">
            {t("desk.reserve.evening", {
              day: dayIn(times[0].starts_at, tz),
              time: timeIn(times[0].arrive_by, tz),
            })}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {times.map((x) => (
              <Button
                key={x.starts_at}
                type="button"
                size="sm"
                variant={
                  time?.starts_at === x.starts_at ? "default" : "outline"
                }
                className={cn("h-9 lg:h-8")}
                onClick={() => {
                  setStartsAt(x.starts_at)
                  setTables([])
                }}
              >
                {timeIn(x.starts_at, tz)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {time && (
        <TablePicker
          // a table chosen for another time or day is dropped when the time changes (see above)
          key={`${date}-${time.starts_at}-${guests}`}
          value={tables}
          onChange={setTables}
          guests={guests}
          date={date}
          allowed={new Set(time.free_table_ids)}
          listClass="max-h-[22dvh] sm:max-h-[26dvh]"
          planClass="max-h-[30dvh] sm:max-h-[36dvh]"
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rs-name">{t("desk.reserve.name")}</Label>
          <Input
            id="rs-name"
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            className="h-11 lg:h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rs-phone">{t("desk.reserve.phone")}</Label>
          <Input
            id="rs-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 lg:h-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rs-notes">{t("desk.notes")}</Label>
        <Textarea
          id="rs-notes"
          rows={2}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {!complete && (
        <p className="text-sm text-muted-foreground">
          {t("desk.reserve.missing")}
        </p>
      )}
    </FormDialog>
  )
}
