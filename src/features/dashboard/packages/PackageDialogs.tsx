import {} from "@tanstack/react-query"
import { MinusIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import {} from "@/components/global/form"
import {} from "@/components/global/page-state"
import {} from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {} from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { CustomerPackage, CustomerPackageStatus } from "@/types/package"
import { dayIn, money } from "@/lib/format"
import { ymdLabel } from "@/lib/packages"
import {} from "@/lib/phone"
import {} from "@/lib/roles"
import {} from "@/lib/utils"

import { useChange, useSettings } from "@/hooks/use-branch"
import {} from "../context"
import {} from "../desk/api"
import { FormDialog } from "../ui"
import { packageApi, usePackageVisits } from "./api"

const METHODS = ["cash", "transfer", "qr", "other"] as const
const input = "h-11 text-base lg:h-9 lg:text-sm"

/** The colour of a status badge: green is usable, amber is waiting, the rest is grey */
export function statusTone(s: CustomerPackageStatus) {
  return s === "active"
    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200"
    : s === "pending_payment"
      ? "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200"
      : "bg-muted text-muted-foreground"
}

/** Cancel with a confirm step (no money goes back through the app: that is for the team to settle) */
export function CancelPackage({
  pkg,
  pending,
  onConfirm,
}: {
  pkg: CustomerPackage
  pending: boolean
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        className="h-11 text-destructive lg:h-9"
        onClick={() => setOpen(true)}
      >
        {t("packages.cancel")}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t("packages.cancelTitle", { code: pkg.code })}
        description={t(
          pkg.payment_status === "paid"
            ? "packages.cancelPaidHint"
            : "packages.cancelHint",
        )}
        submitLabel={t("packages.cancel")}
        pending={pending}
        error={null}
        onSubmit={(e) => {
          e.preventDefault()
          onConfirm()
          setOpen(false)
        }}
      >
        <p className="text-sm text-muted-foreground">
          {pkg.name} · {pkg.customer_name}
        </p>
      </FormDialog>
    </>
  )
}

/** How the money came in at the desk */
export function MethodPicker({
  value,
  onChange,
  name,
}: {
  value: string
  onChange: (m: string) => void
  name: string
}) {
  const { t } = useTranslation()
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("packages.howPaid")}</legend>
      <div className="grid grid-cols-2 gap-2">
        {METHODS.map((m) => (
          <label
            key={m}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary"
          >
            <input
              type="radio"
              name={name}
              checked={value === m}
              onChange={() => onChange(m)}
              className="accent-primary"
            />
            <span className="text-sm">{t(`desk.methods.${m}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function MarkPaidDialog({
  pkg,
  onClose,
}: {
  pkg: CustomerPackage
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [method, setMethod] = useState<string>(
    pkg.slip_sent_at ? "transfer" : "cash",
  )
  const mark = useChange(packageApi.markPaid, ["sold-packages"])
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("packages.markPaidTitle", { code: pkg.code })}
      description={t("packages.markPaidLead", {
        price: money(pkg.price, pkg.currency),
      })}
      submitLabel={t("packages.markPaid")}
      pending={mark.isPending}
      error={mark.error}
      onSubmit={(e) => {
        e.preventDefault()
        mark.mutate(
          { id: pkg.id, method },
          {
            onSuccess: () => {
              toast.success(t("packages.paidDone"))
              onClose()
            },
          },
        )
      }}
    >
      <MethodPicker name="mp-method" value={method} onChange={setMethod} />
    </FormDialog>
  )
}

/** Add or remove visits, or extend the last day, with a reason that is kept in the log */
export function AdjustDialog({
  pkg,
  onClose,
}: {
  pkg: CustomerPackage
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [visits, setVisits] = useState(0)
  const [days, setDays] = useState(0)
  const [note, setNote] = useState("")
  const [missing, setMissing] = useState(false)
  const adjust = useChange(packageApi.adjust, ["sold-packages"])
  const canExtend = pkg.kind === "months" ? !!pkg.ends_on : !!pkg.expires_on
  const lastDay = pkg.kind === "months" ? pkg.ends_on : pkg.expires_on
  const v = visits
  const d = days
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("packages.adjustTitle", { code: pkg.code })}
      description={t("packages.adjustLead")}
      submitLabel={t("packages.adjustSubmit")}
      pending={adjust.isPending}
      error={adjust.error}
      onSubmit={(e) => {
        e.preventDefault()
        if (!note.trim() || (v === 0 && d === 0)) {
          setMissing(true)
          return
        }
        adjust.mutate(
          { id: pkg.id, visits: v, extend_days: d, note: note.trim() },
          {
            onSuccess: () => {
              toast.success(t("packages.adjusted"))
              onClose()
            },
          },
        )
      }}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {pkg.name} · {pkg.customer_name}
        </p>
        {pkg.kind === "times" && (
          <div className="space-y-1.5">
            <Label htmlFor="adj-visits">{t("packages.adjustVisits")}</Label>
            <Stepper
              id="adj-visits"
              value={visits}
              onChange={setVisits}
              min={-pkg.times_left}
              signed
              label={t("packages.adjustVisits")}
            />
            <p className="text-sm text-muted-foreground">
              {t("packages.adjustVisitsHint", {
                left: pkg.times_left,
                after: pkg.times_left + visits,
              })}
            </p>
          </div>
        )}
        {canExtend && (
          <div className="space-y-1.5">
            <Label htmlFor="adj-days">{t("packages.adjustDays")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="adj-days"
                inputMode="numeric"
                value={days === 0 ? "" : String(days)}
                placeholder="0"
                onChange={(e) =>
                  setDays(Number(e.target.value.replace(/[^\d]/g, "")) || 0)
                }
                className={`${input} w-28`}
              />
              {(
                [
                  ["week", 0, 7],
                  ["month", 1, 0],
                  ["months3", 3, 0],
                  ["months6", 6, 0],
                  ["year", 12, 0],
                ] as const
              ).map(([key, months, fixed]) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  className="h-11 lg:h-9"
                  onClick={() => setDays(fixed || monthsFrom(lastDay, months))}
                >
                  {t(`packages.quick.${key}`)}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("packages.adjustDaysHint", {
                day: ymdLabel(
                  pkg.kind === "months" ? pkg.ends_on : pkg.expires_on,
                ),
              })}
            </p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="adj-note">{t("packages.adjustNote")}</Label>
          <Textarea
            id="adj-note"
            rows={2}
            maxLength={200}
            value={note}
            aria-invalid={(missing && !note.trim()) || undefined}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {missing && v === 0 && d === 0 && (
          <p className="text-sm text-destructive">
            {t("packages.adjustNothing")}
          </p>
        )}
      </div>
    </FormDialog>
  )
}

/** The log of a package: every visit used, given back or adjusted, newest first */
export function VisitsDialog({
  pkg,
  onClose,
}: {
  pkg: CustomerPackage
  onClose: () => void
}) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const log = usePackageVisits(pkg.id)
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("packages.logTitle", { code: pkg.code })}
      submitLabel={t("packages.close")}
      pending={false}
      error={log.error}
      onSubmit={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      {log.isPending ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : log.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("packages.logEmpty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {log.data?.map((v) => (
            <li key={v.id} className="rounded-lg border p-3 text-sm">
              <p className="flex items-center justify-between gap-2 font-medium">
                <span>
                  {v.change < 0
                    ? t("packages.logUsed")
                    : v.change > 0
                      ? t("packages.logAdded", { count: v.change })
                      : t("packages.logNoChange")}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {dayIn(v.created_at, tz)}
                </span>
              </p>
              {v.note && <p className="text-muted-foreground">{v.note}</p>}
              {v.by_name && (
                <p className="text-xs text-muted-foreground">{v.by_name}</p>
              )}
              {v.booking_id && (
                <p className="text-xs text-muted-foreground">
                  {t("packages.logBooking", { id: v.booking_id })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </FormDialog>
  )
}

/** − and + buttons around the number, so nothing has to be typed (a phone keyboard is slow for a +1) */
export function Stepper({
  id,
  value,
  onChange,
  min,
  step = 1,
  signed,
  label,
}: {
  id: string
  value: number
  onChange: (n: number) => void
  min: number
  step?: number
  /** show +3 / -1 / 0 */
  signed?: boolean
  label: string
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <Button
        type="button"
        variant="outline"
        className="size-11 text-xl lg:size-9"
        disabled={value - step < min}
        aria-label={t("packages.minusOne")}
        onClick={() => onChange(value - step)}
      >
        <MinusIcon />
      </Button>
      <output
        id={id}
        className="min-w-16 text-center text-xl font-semibold tabular-nums"
      >
        {signed && value > 0 ? `+${value}` : value}
      </output>
      <Button
        type="button"
        variant="outline"
        className="size-11 text-xl lg:size-9"
        aria-label={t("packages.plusOne")}
        onClick={() => onChange(value + step)}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

/**
 * Days to add so the last day moves by whole calendar months: counted from the old last day, or from today when it
 * has passed already (the same as the server does)
 */
export function monthsFrom(lastDay: string, months: number) {
  const today = new Date()
  const base = new Date(
    `${lastDay || today.toISOString().slice(0, 10)}T12:00:00`,
  )
  const from =
    base > today
      ? base
      : new Date(today.toISOString().slice(0, 10) + "T12:00:00")
  const to = new Date(from)
  to.setMonth(to.getMonth() + months)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}
