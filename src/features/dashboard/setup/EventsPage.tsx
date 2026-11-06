import { CopyIcon, PencilIcon, PlusIcon, TagIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { PageError } from "@/components/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ZONE_STYLES } from "@/components/floor-plan/look"
import type { EventItem, EventPrices, ZoneColor } from "@/lib/api/types"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  manage,
  useChange,
  useDelete,
  useEventPrices,
  useEvents,
  useSportsList,
} from "../api"
import {
  ActiveSwitch,
  DeleteButton,
  EmptyState,
  FormDialog,
  ImageField,
  PageHeader,
} from "../ui"
import { AreaPicker, LineupEditor, TimeFields } from "./EventProgramFields"
import { PayInfoPanel } from "./PayInfoPanel"
import { useInvalidate } from "./shared"

const input = "h-11 text-base lg:h-9 lg:text-sm"

/** The days of an event: "31 Dec 2026" or "31 Dec – 1 Jan" */
function days(e: { starts_on: string; ends_on: string }) {
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  return !e.ends_on || e.ends_on === e.starts_on
    ? fmt(e.starts_on)
    : `${fmt(e.starts_on)} – ${fmt(e.ends_on)}`
}

/** /setup/events — event days: the tables are sold at a price and paid before the night */
export function EventsPage() {
  const { t } = useTranslation()
  const events = useEvents()
  const [editing, setEditing] = useState<EventItem | "new" | null>(null)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("events.title")}
        lead={t("events.lead")}
        actions={
          <Button className="h-11 lg:h-9" onClick={() => setEditing("new")}>
            <PlusIcon />
            {t("events.add")}
          </Button>
        }
      />
      {events.isPending ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : events.isError ? (
        <PageError error={events.error} onRetry={() => events.refetch()} />
      ) : events.data.length === 0 ? (
        <EmptyState text={t("events.empty")} />
      ) : (
        <ul className="divide-y rounded-xl bg-background ring-1 ring-border">
          {events.data.map((e) => (
            <EventRow key={e.id} event={e} onEdit={() => setEditing(e)} />
          ))}
        </ul>
      )}
      <PayInfoPanel />
      {editing && (
        <EventDialog
          event={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function EventRow({ event, onEdit }: { event: EventItem; onEdit: () => void }) {
  const { t } = useTranslation()
  const invalidate = useInvalidate(["events"])
  const [pricing, setPricing] = useState(false)
  const [copying, setCopying] = useState(false)
  const [open, setOpen] = useState(false)
  const remove = useDelete(manage.deleteEvent, () => {
    setOpen(false)
    invalidate()
  })

  return (
    <li className="space-y-2 px-3 py-3">
      <div className="flex items-start gap-3">
        {event.ad_url || event.background_url ? (
          <img
            src={event.ad_url || event.background_url}
            alt=""
            className="size-14 shrink-0 rounded-lg object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{event.name}</p>
          <p className="text-sm text-muted-foreground">{days(event)}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant={event.published ? "default" : "outline"}>
              {event.published ? t("events.published") : t("events.draft")}
            </Badge>
            {event.waiting > 0 && (
              <Badge variant="secondary">
                {t("events.waiting", { count: event.waiting })}
              </Badge>
            )}
            {event.paid > 0 && (
              <Badge variant="secondary">
                {t("events.paid", { count: event.paid })}
              </Badge>
            )}
          </div>
        </div>
        <DeleteButton
          what={event.name}
          open={open}
          onOpenChange={setOpen}
          pending={remove.isPending}
          error={remove.error}
          description={t("events.deleteHint")}
          onConfirm={() => remove.mutate(event.id)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11 lg:h-9" onClick={onEdit}>
          <PencilIcon />
          {t("dash.edit")}
        </Button>
        <Button
          variant="outline"
          className="h-11 lg:h-9"
          onClick={() => setPricing(true)}
        >
          <TagIcon />
          {t("events.prices")}
        </Button>
        <Button
          variant="outline"
          className="h-11 lg:h-9"
          onClick={() => setCopying(true)}
        >
          <CopyIcon />
          {t("events.copy")}
        </Button>
      </div>
      {pricing && (
        <PricesDialog event={event} onClose={() => setPricing(false)} />
      )}
      {copying && (
        <CopyDialog event={event} onClose={() => setCopying(false)} />
      )}
    </li>
  )
}

/** Every day from one date to another (YYYY-MM-DD), at most 31 */
function eachDay(from: string, to: string) {
  const out: string[] = []
  const d = new Date(`${from}T12:00:00Z`)
  while (
    !Number.isNaN(d.getTime()) &&
    d.toISOString().slice(0, 10) <= to &&
    out.length < 31
  ) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

function EventDialog({
  event,
  onClose,
}: {
  event: EventItem | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)
  const [name, setName] = useState(event?.name ?? "")
  const [description, setDescription] = useState(event?.description ?? "")
  const [startsOn, setStartsOn] = useState(event?.starts_on ?? today)
  const [moreDays, setMoreDays] = useState(
    !!event?.ends_on && event.ends_on !== event.starts_on,
  )
  const [endsOn, setEndsOn] = useState(
    event?.ends_on || event?.starts_on || today,
  )
  const [background, setBackground] = useState({
    key: event?.background_key ?? "",
    url: event?.background_url ?? "",
  })
  const [ad, setAd] = useState({
    key: event?.ad_key ?? "",
    url: event?.ad_url ?? "",
  })
  // minutes, as the API counts them (0 = the 24 hour default); the server allows 15 minutes to 7 days
  const [holdMinutes, setHoldMinutes] = useState(
    String(event?.hold_minutes || 1440),
  )
  const [price, setPrice] = useState(String(event?.default_price ?? 0))
  const [bigTables, setBigTables] = useState(
    String(event?.big_booking_tables || 4),
  )
  const [bigMinutes, setBigMinutes] = useState(
    String(event?.big_hold_minutes || 60),
  )
  const [published, setPublished] = useState(event?.published ?? false)
  const [acceptGuests, setAcceptGuests] = useState(event?.accept_guests ?? true)
  const [startTime, setStartTime] = useState(event?.start_time ?? "")
  const [endTime, setEndTime] = useState(event?.end_time ?? "")
  const [areaIds, setAreaIds] = useState<number[]>(event?.area_ids ?? [])
  const [lineup, setLineup] = useState(event?.lineup ?? [])
  const areas = useSportsList().data ?? []
  const save = useChange(manage.saveEvent, ["events"])
  // the days of a several-day event: a lineup line can belong to one of them
  const days = eachDay(startsOn, moreDays ? endsOn : startsOn)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    save.mutate(
      {
        id: event?.id,
        name: name.trim(),
        description: description.trim(),
        starts_on: startsOn,
        ends_on: moreDays ? endsOn : "",
        background_key: background.key,
        ad_key: ad.key,
        hold_minutes: Math.min(
          Math.max(Math.round(Number(holdMinutes)) || 1440, 15),
          10080,
        ),
        big_booking_tables: Math.max(Number(bigTables) || 4, 1),
        big_hold_minutes: Math.max(Number(bigMinutes) || 60, 1),
        default_price: Math.max(Number(price) || 0, 0),
        published,
        accept_guests: acceptGuests,
        start_time: startTime,
        end_time: startTime ? endTime : "",
        area_ids: areaIds,
        // lines left empty are dropped; a line for a day the event no longer has becomes an every-day line
        lineup: lineup
          .filter((r) => r.title.trim() && r.start_time)
          .map((r) => ({
            ...r,
            title: r.title.trim(),
            day: days.includes(r.day) ? r.day : "",
          })),
      },
      {
        onSuccess: () => {
          toast.success(t("events.saved"))
          onClose()
        },
      },
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={event ? t("events.editTitle") : t("events.addTitle")}
      submitLabel={t("dash.save")}
      pending={save.isPending}
      error={save.error}
      onSubmit={submit}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ev-name">{t("events.name")}</Label>
        <Input
          id="ev-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
          maxLength={120}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-desc">{t("events.description")}</Label>
        <Textarea
          id="ev-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ev-start">
            {moreDays ? t("events.firstDay") : t("events.day")}
          </Label>
          <Input
            id="ev-start"
            type="date"
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
            className={input}
          />
        </div>
        {moreDays && (
          <div className="space-y-1.5">
            <Label htmlFor="ev-end">{t("events.lastDay")}</Label>
            <Input
              id="ev-end"
              type="date"
              min={startsOn}
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              className={input}
            />
          </div>
        )}
      </div>
      <ActiveSwitch
        id="ev-more"
        checked={moreDays}
        onChange={setMoreDays}
        label={t("events.moreDays")}
        hint={t("events.moreDaysHint")}
      />
      <TimeFields
        start={startTime}
        end={endTime}
        onStart={setStartTime}
        onEnd={setEndTime}
      />
      <AreaPicker areas={areas} value={areaIds} onChange={setAreaIds} />
      <LineupEditor rows={lineup} days={days} onChange={setLineup} />
      <ImageField
        label={t("events.background")}
        folder="branding"
        url={background.url}
        wide
        onChange={(key, url) => setBackground({ key, url })}
      />
      <ImageField
        label={t("events.ad")}
        folder="branding"
        url={ad.url}
        wide
        onChange={(key, url) => setAd({ key, url })}
      />
      <p className="-mt-2 text-sm text-muted-foreground">
        {t("events.adHint")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ev-price">{t("events.defaultPrice")}</Label>
          <Input
            id="ev-price"
            type="number"
            inputMode="numeric"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={input}
          />
          <p className="text-sm text-muted-foreground">
            {t("events.defaultPriceHint")}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-hold">{t("events.holdMinutes")}</Label>
          <Input
            id="ev-hold"
            type="number"
            inputMode="numeric"
            min={15}
            max={10080}
            value={holdMinutes}
            onChange={(e) => setHoldMinutes(e.target.value)}
            className={input}
          />
          <p className="text-sm text-muted-foreground">
            {t("events.holdHint")}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ev-big">{t("events.bigTables")}</Label>
          <Input
            id="ev-big"
            type="number"
            inputMode="numeric"
            min={1}
            value={bigTables}
            onChange={(e) => setBigTables(e.target.value)}
            className={input}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-bigmin">{t("events.bigMinutes")}</Label>
          <Input
            id="ev-bigmin"
            type="number"
            inputMode="numeric"
            min={1}
            value={bigMinutes}
            onChange={(e) => setBigMinutes(e.target.value)}
            className={input}
          />
        </div>
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">
        {t("events.bigHint", {
          n: Number(bigTables) || 4,
          m: Number(bigMinutes) || 60,
        })}
      </p>
      <ActiveSwitch
        id="ev-guests"
        checked={acceptGuests}
        onChange={setAcceptGuests}
        label={t("events.acceptGuests")}
        hint={t("events.acceptGuestsHint")}
      />
      <ActiveSwitch
        id="ev-published"
        checked={published}
        onChange={setPublished}
        label={t("events.publish")}
        hint={t("events.publishHint")}
      />
    </FormDialog>
  )
}

function CopyDialog({
  event,
  onClose,
}: {
  event: EventItem
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(`${event.name} (${t("events.copyWord")})`)
  const [startsOn, setStartsOn] = useState(event.starts_on)
  const span =
    event.ends_on && event.ends_on !== event.starts_on
      ? Math.round(
          (Date.parse(event.ends_on) - Date.parse(event.starts_on)) / 864e5,
        )
      : 0
  const save = useChange(manage.copyEvent, ["events"])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const end = new Date(`${startsOn}T12:00:00Z`)
    end.setUTCDate(end.getUTCDate() + span)
    save.mutate(
      {
        id: event.id,
        name: name.trim(),
        starts_on: startsOn,
        ends_on: span ? end.toISOString().slice(0, 10) : "",
      },
      {
        onSuccess: () => {
          toast.success(t("events.copied"))
          onClose()
        },
      },
    )
  }

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("events.copyTitle", { name: event.name })}
      description={t("events.copyLead")}
      submitLabel={t("events.copy")}
      pending={save.isPending}
      error={save.error}
      onSubmit={submit}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ev-copy-name">{t("events.name")}</Label>
        <Input
          id="ev-copy-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-copy-day">
          {span ? t("events.firstDay") : t("events.day")}
        </Label>
        <Input
          id="ev-copy-day"
          type="date"
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
          className={input}
        />
      </div>
    </FormDialog>
  )
}

/** Prices of one event: the default, a price per zone, and a price on single tables */
function PricesDialog({
  event,
  onClose,
}: {
  event: EventItem
  onClose: () => void
}) {
  const { t } = useTranslation()
  const prices = useEventPrices(event.id)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("events.pricesTitle", { name: event.name })}
          </DialogTitle>
          <DialogDescription>{t("events.pricesLead")}</DialogDescription>
        </DialogHeader>
        {prices.isPending ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : prices.isError ? (
          <PageError error={prices.error} onRetry={() => prices.refetch()} />
        ) : (
          <PricesForm
            key={prices.dataUpdatedAt}
            event={event}
            initial={prices.data}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PricesForm({
  event,
  initial,
  onClose,
}: {
  event: EventItem
  initial: EventPrices
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [fallback, setFallback] = useState(String(initial.default_price))
  const [zones, setZones] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      initial.zones.map((z) => [
        z.item_id,
        z.price == null ? "" : String(z.price),
      ]),
    ),
  )
  const [tables, setTables] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      initial.tables.map((x) => [
        x.table_id,
        x.own == null ? "" : String(x.own),
      ]),
    ),
  )
  const save = useChange(manage.saveEventPrices, ["events"])
  const filled = (v: string) => v.trim() !== "" && Number(v) >= 0

  const submit = () =>
    save.mutate(
      {
        id: event.id,
        default_price: Math.max(Number(fallback) || 0, 0),
        zones: initial.zones
          .filter((z) => filled(zones[z.item_id] ?? ""))
          .map((z) => ({
            item_id: z.item_id,
            price: Number(zones[z.item_id]),
          })),
        tables: initial.tables
          .filter((x) => filled(tables[x.table_id] ?? ""))
          .map((x) => ({
            table_id: x.table_id,
            price: Number(tables[x.table_id]),
          })),
      },
      {
        onSuccess: () => {
          toast.success(t("events.pricesSaved"))
          onClose()
        },
      },
    )

  return (
    <div className="space-y-5">
      <ErrorAlert error={save.error} />
      <div className="space-y-1.5">
        <Label htmlFor="pr-default">{t("events.defaultPrice")}</Label>
        <Input
          id="pr-default"
          type="number"
          inputMode="numeric"
          min={0}
          value={fallback}
          onChange={(e) => setFallback(e.target.value)}
          className={input}
        />
        <p className="text-sm text-muted-foreground">
          {t("events.defaultPriceHint")} ({initial.currency})
        </p>
      </div>

      {initial.zones.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("events.zones")}</legend>
          <p className="text-sm text-muted-foreground">
            {t("events.zonesHint")}
          </p>
          {initial.zones.map((z) => (
            <div key={z.item_id} className="flex items-center gap-3">
              <span
                className={cn(
                  "size-4 shrink-0 rounded-full border-2",
                  ZONE_STYLES[(z.color || "green") as ZoneColor],
                )}
                aria-hidden
              />
              <Label
                htmlFor={`zone-${z.item_id}`}
                className="min-w-0 flex-1 truncate"
              >
                {z.label || t("events.zoneNoName")}
              </Label>
              <Input
                id={`zone-${z.item_id}`}
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={t("events.samePrice")}
                value={zones[z.item_id] ?? ""}
                onChange={(e) =>
                  setZones({ ...zones, [z.item_id]: e.target.value })
                }
                className={`${input} w-36`}
              />
            </div>
          ))}
        </fieldset>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("events.tables")}</legend>
        <p className="text-sm text-muted-foreground">
          {t("events.tablesHint")}
        </p>
        {initial.tables.map((x) => (
          <div key={x.table_id} className="flex items-center gap-3">
            <Label htmlFor={`table-${x.table_id}`} className="min-w-0 flex-1">
              <span className="font-medium">{x.name}</span>
              <span className="block text-xs text-muted-foreground">
                {t("events.seatsN", { count: x.seats })} ·{" "}
                {x.price > 0
                  ? money(x.price, initial.currency)
                  : t("events.notForSale")}
              </span>
            </Label>
            <Input
              id={`table-${x.table_id}`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={t("events.samePrice")}
              value={tables[x.table_id] ?? ""}
              onChange={(e) =>
                setTables({ ...tables, [x.table_id]: e.target.value })
              }
              className={`${input} w-36`}
            />
          </div>
        ))}
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 lg:h-9"
          onClick={onClose}
        >
          {t("dash.cancel")}
        </Button>
        <Button
          type="button"
          className="h-11 lg:h-9"
          disabled={save.isPending}
          onClick={submit}
        >
          {save.isPending && <Spinner />}
          {t("dash.save")}
        </Button>
      </div>
    </div>
  )
}
