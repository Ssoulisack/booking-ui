import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form"
import { useTranslation } from "react-i18next"

import { TextField } from "@/components/form"
import { NationalitySelect } from "@/components/NationalitySelect"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { LAOS } from "@/lib/countries"

interface IdentityValues {
  nationality: string
  phone: string
  email: string
}

/**
 * Nationality, phone and email for registering and My account. The nationality decides what is
 * needed: a Lao account needs a phone (email optional), any other needs an email (phone optional).
 */
export function IdentityFields<T extends IdentityValues>({
  control,
  register,
  errors,
  nationality,
}: {
  control: Control<T>
  register: UseFormRegister<T>
  errors: FieldErrors<T>
  nationality: string
}) {
  const { t } = useTranslation()
  // the form's own type is wider than IdentityValues; these three fields always exist in it
  const c = control as unknown as Control<IdentityValues>
  const reg = register as unknown as UseFormRegister<IdentityValues>
  const err = errors as FieldErrors<IdentityValues>
  const lao = nationality === LAOS
  const chosen = nationality !== ""

  return (
    <>
      <Controller
        control={c}
        name="nationality"
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error || undefined}>
            <FieldLabel htmlFor="nationality">
              {t("identity.nationality")}
            </FieldLabel>
            <NationalitySelect
              id="nationality"
              value={field.value}
              onChange={field.onChange}
              invalid={!!fieldState.error}
            />
            {fieldState.error?.message && (
              <FieldError>{t(fieldState.error.message)}</FieldError>
            )}
          </Field>
        )}
      />
      {chosen && (
        <>
          <div>
            <TextField
              label={lao ? t("identity.phoneLao") : t("identity.phoneOptional")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="2055551234"
              registration={reg("phone")}
              error={err.phone}
            />
            <FieldDescription className="mt-1.5">
              {lao
                ? t("identity.phoneLaoHint")
                : t("identity.phoneForeignHint")}
            </FieldDescription>
          </div>
          <div>
            <TextField
              label={lao ? t("identity.emailOptional") : t("fields.email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              registration={reg("email")}
              error={err.email}
            />
            {lao && (
              <FieldDescription className="mt-1.5">
                {t("identity.emailLaoHint")}
              </FieldDescription>
            )}
          </div>
        </>
      )}
    </>
  )
}
