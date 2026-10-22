import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { brandStyle } from "@/features/public/brand"
import type { BookingMode } from "@/lib/api/types"

import { MODES } from "./options"

// Form pieces shared by the company settings and a branch's settings

export function Text({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-base lg:h-9 lg:text-sm"
      />
    </div>
  )
}

export function Area({
  id,
  label,
  value,
  onChange,
  hint,
  hideLabel,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  /** the label is already shown above (kept for screen readers) */
  hideLabel?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <Textarea
        id={id}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-base lg:text-sm"
      />
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Choice({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 w-full lg:h-9">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Who can book: with an account, as a guest, or both */
export function ModePicker({
  name,
  value,
  onChange,
  hideLegend,
}: {
  name: string
  value: BookingMode
  onChange: (m: BookingMode) => void
  /** the question is already shown above (kept for screen readers) */
  hideLegend?: boolean
}) {
  const { t } = useTranslation()
  return (
    <fieldset className="space-y-2">
      <legend className={hideLegend ? "sr-only" : "mb-2 text-sm font-medium"}>
        {t("settings.whoCanBook")}
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <label
            key={m}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary"
          >
            <input
              type="radio"
              name={name}
              value={m}
              checked={value === m}
              onChange={() => onChange(m)}
              className="mt-1 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">
                {t(`settings.modes.${m}`)}
              </span>
              <span className="block text-sm text-muted-foreground">
                {t(`settings.modeHints.${m}`)}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** The brand colour, with a sample button as customers will see it */
export function BrandColor({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5">
      <Label htmlFor="s-color">{t("settings.color")}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="s-color"
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-md border bg-transparent"
        />
        <Input
          aria-label={t("settings.colorHex")}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          className="h-11 w-32 font-mono text-base lg:h-9 lg:text-sm"
        />
        <span
          style={brandStyle(value)}
          className="inline-flex h-11 items-center rounded-lg bg-[var(--brand)] px-4 text-sm font-medium text-[var(--brand-foreground)]"
        >
          {t("public.book")}
        </span>
      </div>
    </div>
  )
}
