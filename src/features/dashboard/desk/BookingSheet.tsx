import { MailIcon, PhoneIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/features/public/BookingCard"
import { ConfirmDialog } from "../ui"
import { PaymentBadge } from "./PaymentBadge"
import { bookingTitle, currentItems } from "@/features/public/booking-utils"
import { eventBookingWhen } from "@/features/public/event-program"
import type { Booking, PaymentMethod } from "@/lib/api/types"
import { floorName } from "@/lib/floor-plan"
import { dayIn, duration, money, timeIn } from "@/lib/format"
import { displayPhone, telHref } from "@/lib/phone"
import { cn } from "@/lib/utils"

import { useSettings } from "../api"
import {
  useBooking,
  useChangeStatus,
  useMarkArrived,
  useSetPayment,
} from "./api"
import { BookingPayments } from "./BookingPayments"
import { MoveTablesDialog } from "./TableDesk"

const METHODS: PaymentMethod[] = ["cash", "transfer", "qr", "other"]

/** One booking at the desk, as a popup: details, status changes and payment */
export function BookingSheet({
  id,
  onClose,
}: {
  id: number | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const booking = useBooking(id)
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {booking.data ? bookingTitle(booking.data) : t("desk.booking")}
          </DialogTitle>
          <DialogDescription>
            {booking.data && `${t("booking.code")} ${booking.data.code}`}
          </DialogDescription>
        </DialogHeader>
        <div>
          {booking.isPending ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : booking.isError ? (
            <ErrorAlert error={booking.error} />
          ) : (
            <Details booking={booking.data} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Details({ booking: b }: { booking: Booking }) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const status = useChangeStatus()
  const payment = useSetPayment()
  const arrive = useMarkArrived()
  // one change at a time: while any action below is working, all the other actions wait (no cancel on top of a confirm)
  const busy = status.isPending || payment.isPending || arrive.isPending
  // a payment is only recorded after "Are you sure?": the method being confirmed, or "unpaid"
  const [confirming, setConfirming] = useState<PaymentMethod | "unpaid" | null>(
    null,
  )
  const [moving, setMoving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState("")
  const [now] = useState(() => Date.now())
  const started = Date.parse(b.starts_at) <= now
  const active = b.status === "pending" || b.status === "confirmed"
  const minutes = Math.round(
    (Date.parse(b.ends_at) - Date.parse(b.starts_at)) / 60_000,
  )
  const who = b.customer_name ?? b.guest_name ?? "—"
  // a restaurant table: people, where and when to arrive instead of a length and a price
  const isTable = !!b.guests
  // event days: the tables were sold, so the money is part of the booking; releasing them = cancelling
  const isEvent = !!b.event_id
  const waitingForMoney =
    isEvent && b.status === "pending" && b.payment_status === "unpaid"
  const where = [
    b.sport_name,
    b.area_floor !== undefined ? floorName(t, b.area_floor) : "",
    b.zones,
  ]
    .filter(Boolean)
    .join(" · ")
  const phone = b.guest_phone || b.customer_phone
  const email = b.customer_email

  const change = (next: Booking["status"], why?: string) =>
    status.mutate(
      { id: b.id, status: next, reason: why },
      {
        onSuccess: () => {
          setCancelling(false)
          toast.success(
            t(
              isTable && next === "completed"
                ? "desk.billClosed"
                : `desk.statusDone.${next}`,
            ),
          )
        },
      },
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={b.status} />
        <span className="text-sm text-muted-foreground">
          {t(`desk.createdBy.${b.created_by ?? "customer"}`)}
        </span>
      </div>
      {(!isTable || isEvent) && <PaymentBadge b={b} big />}

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {b.event_name && (
          <>
            <dt className="text-muted-foreground">
              {t("public.events.event")}
            </dt>
            <dd className="font-medium">{b.event_name}</dd>
          </>
        )}
        <dt className="text-muted-foreground">{t("booking.when")}</dt>
        {isEvent ? (
          // an event day: the event's own time, not the hours the tables are held for
          <dd className="font-medium">
            {eventBookingWhen(
              dayIn(b.starts_at, tz),
              b.event_start_time,
              b.event_end_time,
            )}
          </dd>
        ) : isTable ? (
          <dd className="font-medium">
            {dayIn(b.starts_at, tz)}
            {b.booking_style !== "arrive_by" && `, ${timeIn(b.starts_at, tz)}`}
          </dd>
        ) : (
          <dd className="font-medium">
            {dayIn(b.starts_at, tz)}, {timeIn(b.starts_at, tz)}–
            {timeIn(b.ends_at, tz)} ({duration(minutes)})
          </dd>
        )}
        {isTable && (
          <>
            {b.arrive_by && (
              <>
                <dt className="text-muted-foreground">
                  {t("public.tables.arriveByLabel")}
                </dt>
                <dd className="font-medium">{timeIn(b.arrive_by, tz)}</dd>
              </>
            )}
            {b.arrived_at && (
              <>
                <dt className="text-muted-foreground">{t("desk.arrived")}</dt>
                <dd>{timeIn(b.arrived_at, tz)}</dd>
              </>
            )}
            <dt className="text-muted-foreground">
              {t("public.tables.people")}
            </dt>
            <dd className="font-medium">
              {t("public.tables.guestsLine", { count: b.guests })}
            </dd>
            <dt className="text-muted-foreground">{t("desk.tables")}</dt>
            <dd>
              <p className="font-medium">
                {/* the tables in use now (not the ones the group was moved away from) */}
                {currentItems(b)
                  .map((i) =>
                    t("desk.tableSeats", {
                      name: i.resource_name,
                      count: i.seats,
                    }),
                  )
                  .join(" + ")}
              </p>
              {where && <p className="text-muted-foreground">{where}</p>}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">{t("desk.who")}</dt>
        <dd>
          <p className="font-medium">
            {who}
            {b.member_no && (
              <span className="ml-2 font-normal text-muted-foreground">
                {b.member_no}
              </span>
            )}
          </p>
          {phone && (
            <a
              href={telHref(phone)}
              className="inline-flex min-h-9 items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <PhoneIcon className="size-3.5" />
              {displayPhone(phone)}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex min-h-9 items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <MailIcon className="size-3.5" />
              {email}
            </a>
          )}
        </dd>
        <dt className="text-muted-foreground">{t("desk.createdAt")}</dt>
        <dd>
          <p className="font-medium">
            {dayIn(b.created_at, tz)} {timeIn(b.created_at, tz)}
          </p>
          {b.created_by && (
            <p className="text-muted-foreground">
              {t(`desk.createdBy.${b.created_by}`)}
            </p>
          )}
        </dd>
        {!isTable &&
          b.items.map((i, n) => (
            <div key={n} className="contents">
              <dt className="text-muted-foreground">
                {t(`desk.itemKind.${i.kind}`)}
              </dt>
              <dd>
                {[i.resource_name, i.coach_name, i.class_title]
                  .filter(Boolean)
                  .join(" ")}
                {i.seats > 1 && ` × ${i.seats}`} · {money(i.price, b.currency)}
              </dd>
            </div>
          ))}
        {b.notes && (
          <>
            <dt className="text-muted-foreground">{t("desk.notes")}</dt>
            <dd className="whitespace-pre-line">{b.notes}</dd>
          </>
        )}
        {b.cancel_reason && (
          <>
            <dt className="text-muted-foreground">{t("booking.reason")}</dt>
            <dd>{b.cancel_reason}</dd>
          </>
        )}
      </dl>

      {/* a table is free to book: the bill is paid at the place, outside the system; an event table is sold */}
      {(!isTable || isEvent) && (
        <section className="space-y-3 rounded-xl border p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              {t("booking.total")}
            </span>
            <span className="text-xl font-semibold tabular-nums">
              {money(b.total_price, b.currency)}
            </span>
          </div>
          {b.package && (
            <p className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {t("booking.package")}
              </span>
              <span className="text-right font-medium">
                {b.package}{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {b.package_code}
                </span>
              </span>
            </p>
          )}
          {waitingForMoney && (
            <p className="rounded-lg bg-muted/50 p-3 text-sm">
              {b.slip_sent_at
                ? t("eventPay.slipAtLong", {
                    when: `${dayIn(b.slip_sent_at, tz)} ${timeIn(b.slip_sent_at, tz)}`,
                  })
                : t("eventPay.noSlipLong")}
              {b.pay_by &&
                !b.slip_sent_at &&
                ` ${t("eventPay.payBy", { when: `${dayIn(b.pay_by, tz)} ${timeIn(b.pay_by, tz)}` })}`}
            </p>
          )}
          {b.customer_package_id ? (
            // paid with a package: nothing to take at the desk; to undo it, cancel the booking (the visit goes back)
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {t("desk.paidWith", {
                method: `${t("desk.methods.package")}: ${b.package ?? ""} (${b.package_code ?? ""})`,
                when: b.paid_at
                  ? `${dayIn(b.paid_at, tz)} ${timeIn(b.paid_at, tz)}`
                  : "",
              })}
              <span className="block text-xs font-normal text-muted-foreground">
                {t("desk.packageUndo")}
              </span>
            </p>
          ) : b.payment_status === "paid" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {t("desk.paidWith", {
                  method:
                    b.payment_method === "package" && b.package
                      ? `${t("desk.methods.package")}: ${b.package} (${b.package_code})`
                      : t(`desk.methods.${b.payment_method ?? "other"}`),
                  when: b.paid_at
                    ? `${dayIn(b.paid_at, tz)} ${timeIn(b.paid_at, tz)}`
                    : "",
                })}
              </p>
              {b.payment_method === "online" ||
              (isEvent && b.status === "confirmed") ? (
                // the bank's money: only a refund of the online payment undoes it
                <p className="text-xs text-muted-foreground">
                  {b.payment_method === "online"
                    ? t("desk.paidOnlineHint")
                    : t("desk.paidEventHint")}
                </p>
              ) : (
                <Button
                  variant="ghost"
                  className="h-11 px-2 text-muted-foreground lg:h-9"
                  disabled={busy}
                  onClick={() => setConfirming("unpaid")}
                >
                  {t("desk.markUnpaid")}
                </Button>
              )}
            </div>
          ) : b.status !== "cancelled" ? (
            <div className="space-y-2">
              <p className="text-sm">{t("desk.markPaidWith")}</p>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map((m) => (
                  <Button
                    key={m}
                    variant="outline"
                    className="h-12 lg:h-10"
                    disabled={busy}
                    onClick={() => setConfirming(m)}
                  >
                    {t(`desk.methods.${m}`)}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <ErrorAlert error={payment.error} />
          {confirming && (
            <ConfirmDialog
              title={
                confirming === "unpaid"
                  ? t("desk.confirmUnpaidTitle")
                  : t("desk.confirmPaidTitle")
              }
              description={
                confirming === "unpaid"
                  ? t("desk.confirmUnpaid", { code: b.code })
                  : t("desk.confirmPaid", {
                      code: b.code,
                      amount: money(b.total_price, b.currency),
                      method: t(`desk.methods.${confirming}`),
                    })
              }
              confirmLabel={
                confirming === "unpaid"
                  ? t("desk.confirmUnpaidYes")
                  : t("desk.confirmPaidYes")
              }
              pending={payment.isPending}
              error={payment.error}
              onClose={() => setConfirming(null)}
              onConfirm={() =>
                payment.mutate(
                  confirming === "unpaid"
                    ? { id: b.id, status: "unpaid" }
                    : { id: b.id, status: "paid", method: confirming },
                  {
                    onSuccess: () => {
                      if (confirming !== "unpaid")
                        toast.success(t("desk.paidDone"))
                      setConfirming(null)
                    },
                  },
                )
              }
            />
          )}
        </section>
      )}

      <BookingPayments bookingId={b.id} />

      {active && (
        <section className="space-y-3">
          {/* while the team is cancelling, only the cancel form shows: no Confirm, Arrived or Move table beside it */}
          <div className={cn("flex flex-wrap gap-2", cancelling && "hidden")}>
            {b.status === "pending" && !isEvent && (
              <Button
                className="h-11 lg:h-9"
                disabled={busy}
                loading={
                  status.isPending && status.variables?.status === "confirmed"
                }
                onClick={() => change("confirmed")}
              >
                {t("desk.confirm")}
              </Button>
            )}
            {/* restaurants: Arrived → Close bill; No-show once the time has come; Move table */}
            {isTable && b.status === "confirmed" && (
              <>
                {b.arrived_at ? (
                  <Button
                    className="h-11 lg:h-9"
                    disabled={busy}
                    loading={
                      status.isPending &&
                      status.variables?.status === "completed"
                    }
                    onClick={() => change("completed")}
                  >
                    {t("desk.closeBill")}
                  </Button>
                ) : (
                  <Button
                    className="h-11 lg:h-9"
                    disabled={busy}
                    loading={arrive.isPending}
                    onClick={() =>
                      arrive.mutate(b.id, {
                        onSuccess: () => toast.success(t("desk.arrivedDone")),
                      })
                    }
                  >
                    {t("desk.markArrived")}
                  </Button>
                )}
                {!b.arrived_at && started && (
                  <NoShowAction
                    busy={busy}
                    loading={
                      status.isPending && status.variables?.status === "no_show"
                    }
                    onConfirm={() => change("no_show")}
                  />
                )}
                <Button
                  variant="outline"
                  className="h-11 lg:h-9"
                  disabled={busy}
                  onClick={() => setMoving(true)}
                >
                  {t("desk.moveTable")}
                </Button>
              </>
            )}
            {!isTable && b.status === "confirmed" && started && (
              <>
                <Button
                  className="h-11 lg:h-9"
                  disabled={busy}
                  loading={
                    status.isPending && status.variables?.status === "completed"
                  }
                  onClick={() => change("completed")}
                >
                  {t("desk.complete")}
                </Button>
                <NoShowAction
                  busy={busy}
                  loading={
                    status.isPending && status.variables?.status === "no_show"
                  }
                  onConfirm={() => change("no_show")}
                />
              </>
            )}
            {!cancelling && (
              <Button
                variant="destructive"
                className="h-11 lg:h-9"
                // one change at a time: while Confirm (or Arrived, Complete…) is working, Cancel waits
                disabled={busy}
                onClick={() => setCancelling(true)}
              >
                {waitingForMoney ? t("eventPay.release") : t("booking.cancel")}
              </Button>
            )}
          </div>
          {/* what each desk button does, in plain words (owners asked: "what is Move table? what is No show?") */}
          {b.status === "confirmed" && (isTable || started) && !cancelling && (
            <ul className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              {isTable && !b.arrived_at && (
                <li>
                  <strong className="text-foreground">
                    {t("desk.markArrived")}
                  </strong>
                  {": "}
                  {t("desk.markArrivedHelp")}
                </li>
              )}
              {started && !(isTable && b.arrived_at) && (
                <li>
                  <strong className="text-foreground">
                    {t("desk.noShow")}
                  </strong>
                  {": "}
                  {t("desk.noShowHelp")}
                </li>
              )}
              {isTable && (
                <li>
                  <strong className="text-foreground">
                    {t("desk.moveTable")}
                  </strong>
                  {": "}
                  {t("desk.moveTableHelp")}
                </li>
              )}
              {!isTable && started && (
                <li>
                  <strong className="text-foreground">
                    {t("desk.complete")}
                  </strong>
                  {": "}
                  {t("desk.completeHelp")}
                </li>
              )}
            </ul>
          )}
          {waitingForMoney && !cancelling && (
            <p className="text-sm text-muted-foreground">
              {t("eventPay.releaseHint")}
            </p>
          )}
          {!isTable && b.status === "confirmed" && !started && (
            <p className="text-sm text-muted-foreground">
              {t("desk.afterStart")}
            </p>
          )}
          {cancelling && (
            <div className="space-y-2 rounded-xl border p-3">
              <Label htmlFor="desk-cancel-reason">
                {t("desk.cancelReason")}
              </Label>
              <Textarea
                id="desk-cancel-reason"
                rows={2}
                maxLength={255}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {t("desk.cancelEmail")}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="h-11 lg:h-9"
                  disabled={busy}
                  loading={
                    status.isPending && status.variables?.status === "cancelled"
                  }
                  onClick={() => change("cancelled", reason.trim())}
                >
                  {t("booking.cancelConfirm")}
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 lg:h-9"
                  disabled={busy}
                  onClick={() => setCancelling(false)}
                >
                  {t("booking.keep")}
                </Button>
              </div>
            </div>
          )}
          <ErrorAlert error={status.error ?? arrive.error} />
        </section>
      )}
      {moving && (
        <MoveTablesDialog booking={b} onClose={() => setMoving(false)} />
      )}
    </div>
  )
}

/** "No show" asks once before it frees the table and counts a lost booking */
function NoShowAction({
  onConfirm,
  busy,
  loading,
}: {
  onConfirm: () => void
  /** some action of the dialog is working: nothing else can be pressed */
  busy: boolean
  /** this action itself is working */
  loading: boolean
}) {
  const { t } = useTranslation()
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <Button
        variant="outline"
        className="h-11 lg:h-9"
        disabled={busy}
        onClick={() => setAsking(true)}
      >
        {t("desk.noShow")}
      </Button>
    )
  return (
    <div className="w-full space-y-2 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
      <p>{t("desk.noShowAsk")}</p>
      <div className="flex gap-2">
        <Button
          className="h-11 lg:h-9"
          disabled={busy}
          loading={loading}
          onClick={() => {
            setAsking(false)
            onConfirm()
          }}
        >
          {t("desk.yesNoShow")}
        </Button>
        <Button
          variant="outline"
          className="h-11 lg:h-9"
          onClick={() => setAsking(false)}
        >
          {t("booking.keep")}
        </Button>
      </div>
    </div>
  )
}
