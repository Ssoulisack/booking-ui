import { BadgeCheckIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { ErrorAlert, SubmitButton } from "@/components/global/form"
import { FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSendPhoneCode } from "@/hooks/use-auth"
import { displayPhone, isLaoPhone } from "@/lib/phone"

/**
 * Step 1 of a new account (register, accept an invitation): the Lao mobile number; Send code texts the code
 * (purpose "register": a phone that already has an account is told so)
 */
export function PhoneStep({
  phone,
  onPhone,
  onSent,
}: {
  phone: string
  onPhone: (v: string) => void
  onSent: () => void
}) {
  const { t } = useTranslation()
  const [error, setError] = useState<string>()
  const send = useSendPhoneCode({ onSuccess: onSent })
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!isLaoPhone(phone)) {
          setError("identity.phoneInvalid")
          return
        }
        send.mutate({ phone: phone.trim(), purpose: "register" })
      }}
    >
      <ErrorAlert error={send.error} />
      <div className="space-y-1.5">
        <Label htmlFor="register-phone">{t("identity.phoneLao")}</Label>
        <Input
          id="register-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          autoFocus
          value={phone}
          aria-invalid={!!error}
          onChange={(e) => {
            onPhone(e.target.value)
            setError(undefined)
          }}
          className="h-12 text-base"
        />
        {error ? (
          <p className="text-sm text-destructive">{t(error)}</p>
        ) : (
          <FieldDescription>{t("identity.phoneLaoHint")}</FieldDescription>
        )}
      </div>
      <SubmitButton pending={send.isPending}>{t("smsCode.send")}</SubmitButton>
    </form>
  )
}

/** The phone proved with an SMS code, shown above the last step, with Change (back to step 1) */
export function ProvedPhone({
  phone,
  onChange,
}: {
  phone: string
  onChange: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2.5 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <BadgeCheckIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="truncate">
          {t("registerSteps.phoneProved", { phone: displayPhone(phone) })}
        </span>
      </span>
      <button
        type="button"
        className="min-h-11 shrink-0 font-medium underline-offset-4 hover:underline"
        onClick={onChange}
      >
        {t("registerSteps.change")}
      </button>
    </div>
  )
}
