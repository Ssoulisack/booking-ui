import { CheckIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import type { Availability } from "@/lib/api/types"
import { dayIn, duration, money, timeIn } from "@/lib/format"
import { cn } from "@/lib/utils"

import { lengthsOf } from "./lengths"

const PERIODS = ["morning", "afternoon", "evening"] as const
type Period = (typeof PERIODS)[number]

const periodOf = (hhmm: string): Period => {
  const h = Number(hhmm.slice(0, 2))
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"
}

const endOf = (iso: string, minutes: number) =>
  new Date(Date.parse(iso) + minutes * 60_000).toISOString()

/**
 * Choose how long first, then a start: times are split into morning / afternoon / evening and each
 * button shows start and end ("18:00–19:30"), so nobody books a length they did not mean.
 * `tone` follows the page: the business's brand colour (public) or the dashboard's primary colour.
 */
export function TimePicker({
  availability,
  tz,
  start,
  length,
  onChange,
  disabled,
  tone = "brand",
}: {
  availability: Availability
  tz: string
  start?: string
  length?: number
  onChange: (start: string | undefined, length: number) => void
  disabled?: boolean
  tone?: "brand" | "primary"
}) {
  const { t } = useTranslation()
  const lengths = lengthsOf(availability)
  const len = length && lengths.includes(length) ? length : lengths[0]
  const fits = availability.slots.filter((s) => s.durations_min.includes(len))
  const byPeriod = Object.fromEntries(
    PERIODS.map((p) => [
      p,
      fits.filter((s) => periodOf(timeIn(s.starts_at, tz)) === p),
    ]),
  ) as Record<Period, typeof fits>
  const chosen = fits.find((s) => s.starts_at === start)
  const firstWithTimes =
    PERIODS.find((p) => byPeriod[p].length > 0) ?? "morning"
  const [picked, setPicked] = useState<Period | null>(null)
  const period = chosen
    ? periodOf(timeIn(chosen.starts_at, tz))
    : picked && byPeriod[picked].length
      ? picked
      : firstWithTimes
  const keepsStart = (d: number) =>
    !!start &&
    !!availability.slots
      .find((s) => s.starts_at === start)
      ?.durations_min.includes(d)
  const priceOf = (d: number) =>
    availability.prices.find((p) => p.duration_min === d)?.price
  const currency = availability.currency

  const on =
    tone === "brand"
      ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
      : "border-primary bg-primary text-primary-foreground"
  const off =
    tone === "brand"
      ? "border-black/10 bg-white active:bg-[var(--brand-soft)]"
      : "border-border bg-background hover:bg-muted"

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-base font-semibold">
          {t("public.step.length")}
        </legend>
        <div
          role="radiogroup"
          aria-label={t("public.step.length")}
          className="flex flex-wrap gap-2"
        >
          {lengths.map((d) => {
            const p = priceOf(d)
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={d === len}
                // keep the chosen start if it allows the new length
                onClick={() => onChange(keepsStart(d) ? start : undefined, d)}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center rounded-xl border px-4 py-1.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  d === len ? on : off,
                )}
              >
                <span className="font-semibold">{duration(d)}</span>
                {p !== undefined && currency && (
                  <span className="text-xs opacity-80">
                    {money(p, currency)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-base font-semibold">
          {t("public.step.time")}
        </legend>
        <div
          role="radiogroup"
          aria-label={t("time.partOfDay")}
          className="flex rounded-xl bg-black/5 p-1"
        >
          {PERIODS.map((p) => {
            const count = byPeriod[p].length
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={p === period}
                disabled={count === 0}
                onClick={() => setPicked(p)}
                className={cn(
                  "flex h-11 flex-1 flex-col items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-40",
                  p === period ? "bg-white shadow-sm" : "text-muted-foreground",
                )}
              >
                {t(`time.${p}`)}
                <span className="text-[11px] font-normal opacity-70">
                  {t("time.free", { count })}
                </span>
              </button>
            )
          })}
        </div>
        <div
          role="radiogroup"
          aria-label={t("public.step.time")}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
        >
          {byPeriod[period].map((s) => {
            const selected = s.starts_at === chosen?.starts_at
            return (
              <button
                key={s.starts_at}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onChange(s.starts_at, len)}
                className={cn(
                  "flex min-h-12 items-center justify-center rounded-xl border px-2 text-base font-semibold tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  selected ? on : off,
                )}
              >
                {timeIn(s.starts_at, tz)}–{timeIn(endOf(s.starts_at, len), tz)}
              </button>
            )
          })}
        </div>
      </fieldset>

      {chosen && (
        <p
          className="flex items-center gap-2 text-sm font-medium"
          aria-live="polite"
        >
          <CheckIcon className="size-4 shrink-0" />
          {dayIn(chosen.starts_at, tz)} · {timeIn(chosen.starts_at, tz)}–
          {timeIn(endOf(chosen.starts_at, len), tz)}
          {priceOf(len) !== undefined &&
            currency &&
            ` · ${money(priceOf(len)!, currency)}`}
        </p>
      )}
    </div>
  )
}
