import { useId } from "react"
import type { FieldError, UseFormRegisterReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { TextField } from "@/components/global/form"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

/**
 * "I'm a foreigner (no Lao number)": Lao customers (the default) register and log in with their phone; a foreigner
 * ticks this and uses an email instead.
 */
export function ForeignerToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (foreigner: boolean) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="size-5"
      />
      <Label htmlFor={id} className="font-normal">
        {t("identity.foreigner")}
      </Label>
    </div>
  )
}

/** The login field: the phone number for Lao customers, the email for foreigners */
export function LoginIdField({
  foreigner,
  registration,
  error,
}: {
  foreigner: boolean
  registration: UseFormRegisterReturn
  error?: FieldError
}) {
  const { t } = useTranslation()
  return foreigner ? (
    <TextField
      key="email"
      label={t("fields.email")}
      type="email"
      inputMode="email"
      autoComplete="email"
      autoCapitalize="none"
      registration={registration}
      error={error}
    />
  ) : (
    <TextField
      key="phone"
      label={t("identity.phoneLao")}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="2055551234"
      registration={registration}
      error={error}
    />
  )
}
