import { MessageSquareIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { ErrorAlert, SubmitButton } from "@/components/global/form"
import { AuthHeading } from "@/components/layout/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useCheckPhoneCode, useSendPhoneCode } from "@/hooks/use-auth"
import type { PhonePurpose } from "@/types/auth"

// the server sends at most one code a minute per phone
const SMS_COOLDOWN = 60

/**
 * The code step of register and forgot password: the SMS just went to `phone`; the person types the 6 digits and
 * confirms (the server checks them, without using the code up), can send it again after a minute or change the number.
 * `onConfirmed` gets the right code (the last step sends it again with the account or the new password).
 */
export function PhoneCodeStep({
  phone,
  purpose,
  subtitle,
  onConfirmed,
  onChangePhone,
}: {
  phone: string
  purpose: Exclude<PhonePurpose, "booking">
  subtitle: string
  onConfirmed: (code: string) => void
  onChangePhone: () => void
}) {
  const { t } = useTranslation()
  const [code, setCode] = useState("")
  const [wait, setWait] = useState(SMS_COOLDOWN)
  useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])

  const check = useCheckPhoneCode({ onSuccess: () => onConfirmed(code) })
  const send = useSendPhoneCode({
    onSuccess: () => {
      setWait(SMS_COOLDOWN)
      setCode("")
    },
  })

  return (
    <>
      <MessageSquareIcon className="mb-4 size-10 text-[var(--primary-ink)]" />
      <AuthHeading title={t("forgotPhone.codeTitle")} subtitle={subtitle} />
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (code.length === 6) check.mutate({ phone, purpose, code })
        }}
      >
        <ErrorAlert error={check.error ?? send.error} />
        <Input
          aria-label={t("smsCode.label")}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="h-14 text-center text-2xl tracking-[0.5em] tabular-nums"
        />
        <SubmitButton pending={check.isPending}>
          {t("forgotPhone.confirm")}
        </SubmitButton>
      </form>
      <div className="mt-4 flex items-center justify-between gap-2 text-sm">
        <button
          type="button"
          className="min-h-11 font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={onChangePhone}
        >
          {t("forgotPhone.changePhone")}
        </button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={send.isPending || wait > 0}
          onClick={() => send.mutate({ phone, purpose })}
        >
          {send.isPending && <Spinner />}
          {wait > 0
            ? t("smsCode.again", { seconds: wait })
            : t("smsCode.resend")}
        </Button>
      </div>
    </>
  )
}
