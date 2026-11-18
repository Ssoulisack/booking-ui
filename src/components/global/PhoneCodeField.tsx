import { MessageSquareIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useSendPhoneCode, useSmsOn } from "@/hooks/use-auth"
import { displayPhone, isLaoPhone } from "@/lib/phone"
import type { PhonePurpose } from "@/types/auth"

// the server sends at most one code a minute per phone (each SMS costs money)
const COOLDOWN = 60

/**
 * The 6-digit SMS code for a phone typed above it: "Send code" texts it, the person types it here. Nothing shows while
 * SMS codes are off. `error` is a message key (e.g. "validation.required") shown under the field.
 */
export function PhoneCodeField({
  phone,
  purpose,
  value,
  onChange,
  error,
}: {
  phone: string
  purpose: PhonePurpose
  value: string
  onChange: (code: string) => void
  error?: string
}) {
  const { t } = useTranslation()
  const on = useSmsOn()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [wait, setWait] = useState(0)
  const send = useSendPhoneCode()

  useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])

  if (!on) return null
  const valid = isLaoPhone(phone)
  // the phone was changed after the code went: that code is for the old number
  const stale = sentTo !== null && sentTo !== phone.trim()
  const sendCode = () =>
    send.mutate(
      { phone: phone.trim(), purpose },
      {
        onSuccess: () => {
          setSentTo(phone.trim())
          setWait(COOLDOWN)
        },
      },
    )

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`sms-code-${purpose}`}>{t("smsCode.label")}</Label>
      <div className="flex gap-2">
        <Input
          id={`sms-code-${purpose}`}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={value}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          className="h-12 flex-1 text-center text-lg tracking-[0.4em] tabular-nums"
        />
        <Button
          type="button"
          variant="outline"
          className="h-12 shrink-0"
          disabled={!valid || send.isPending || (wait > 0 && !stale)}
          onClick={sendCode}
        >
          {send.isPending ? <Spinner /> : <MessageSquareIcon />}
          {wait > 0 && !stale
            ? t("smsCode.again", { seconds: wait })
            : sentTo
              ? t("smsCode.resend")
              : t("smsCode.send")}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{t(error)}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {sentTo && !stale
            ? // reset: the same answer whether or not the phone has an account
              t(
                purpose === "reset"
                  ? "smsCode.sentToIfAccount"
                  : "smsCode.sentTo",
                {
                  phone: displayPhone(sentTo),
                },
              )
            : valid
              ? t("smsCode.hint")
              : t("smsCode.phoneFirst")}
        </p>
      )}
    </div>
  )
}
