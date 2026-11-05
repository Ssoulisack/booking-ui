import { type FieldErrors, type UseFormRegister } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { TextField } from "@/components/form"
import { FieldDescription } from "@/components/ui/field"

interface IdentityValues {
  phone: string
  email: string
}

/**
 * Phone and email for registering and My account. The phone is a Lao mobile number (20xxxxxxxx) and is required
 * when registering; the email is optional (a phone-only account logs in with its phone).
 */
export function IdentityFields<T extends IdentityValues>({
  register,
  errors,
  requirePhone = false,
}: {
  register: UseFormRegister<T>
  errors: FieldErrors<T>
  requirePhone?: boolean
}) {
  const { t } = useTranslation()
  // the form's own type is wider than IdentityValues; these two fields always exist in it
  const reg = register as unknown as UseFormRegister<IdentityValues>
  const err = errors as FieldErrors<IdentityValues>

  return (
    <>
      <div>
        <TextField
          label={
            requirePhone ? t("identity.phoneLao") : t("identity.phoneOptional")
          }
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="2055551234"
          registration={reg("phone")}
          error={err.phone}
        />
        <FieldDescription className="mt-1.5">
          {t("identity.phoneLaoHint")}
        </FieldDescription>
      </div>
      <div>
        <TextField
          label={t("identity.emailOptional")}
          type="email"
          inputMode="email"
          autoComplete="email"
          registration={reg("email")}
          error={err.email}
        />
        <FieldDescription className="mt-1.5">
          {t("identity.emailLaoHint")}
        </FieldDescription>
      </div>
    </>
  )
}
