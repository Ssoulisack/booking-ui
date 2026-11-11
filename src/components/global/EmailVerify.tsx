import { BadgeCheckIcon, MailWarningIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useSendEmailCode, useVerifyEmail } from "@/hooks/use-auth"
import { useSession } from "@/stores/session"

// a short pause between taps; the server allows 5 codes in 15 minutes
const COOLDOWN = 30

/**
 * The account's email: "Verified", or "Not verified yet" with "Send code" → a 6-digit code from the email → "Verify".
 * Verifying later is fine. Nothing shows for an account without a real email. `autoSend` sends the first code at once
 * (right after the email was added).
 */
export function EmailVerify({ autoSend = false }: { autoSend?: boolean }) {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const [sent, setSent] = useState(false)
  const [wait, setWait] = useState(0)
  const [code, setCode] = useState("")
  const send = useSendEmailCode()
  const verify = useVerifyEmail({
    onSuccess: () => toast.success(t("emailVerify.done")),
  })
  const sendCode = () =>
    send.mutate(undefined, {
      onSuccess: () => {
        setSent(true)
        setWait(COOLDOWN)
      },
    })

  // the first code goes at once when asked: once only (a ref, so a second run of the effect does not send again)
  const autoSent = useRef(false)
  useEffect(() => {
    if (!autoSend || autoSent.current) return
    autoSent.current = true
    sendCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend])

  useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])

  if (!user) return null
  // no email yet: add it in the form below, then verify it here
  if (user.email_generated)
    return (
      <div
        role="note"
        className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-950 ring-1 ring-red-200 dark:bg-red-400/15 dark:text-red-100 dark:ring-red-400/30"
      >
        <MailWarningIcon className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-semibold">{t("emailVerify.missingTitle")}</span>{" "}
          {t("emailVerify.missing")}
        </span>
      </div>
    )
  if (user.email_verified)
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
        <BadgeCheckIcon className="size-4 shrink-0" />
        {t("emailVerify.verified", { email: user.email })}
      </p>
    )

  return (
    <div className="space-y-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-100 dark:ring-amber-400/30">
      <p className="flex items-start gap-2">
        <MailWarningIcon className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-semibold">{t("emailVerify.notYet")}</span>{" "}
          {sent
            ? t("emailVerify.sentTo", { email: user.email })
            : t("emailVerify.why", { email: user.email })}
        </span>
      </p>
      <ErrorAlert error={send.error ?? verify.error} />
      {sent && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim().length === 6) verify.mutate(code.trim())
          }}
        >
          <Input
            aria-label={t("emailVerify.code")}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="h-11 flex-1 bg-background text-center text-lg tracking-[0.4em] tabular-nums lg:h-9"
          />
          <Button
            type="submit"
            className="h-11 lg:h-9"
            disabled={verify.isPending || code.length !== 6}
          >
            {verify.isPending && <Spinner />}
            {t("emailVerify.verify")}
          </Button>
        </form>
      )}
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full bg-background lg:h-9"
        disabled={send.isPending || wait > 0}
        onClick={sendCode}
      >
        {send.isPending && <Spinner />}
        {wait > 0
          ? t("emailVerify.again", { seconds: wait })
          : sent
            ? t("emailVerify.resend")
            : t("emailVerify.send")}
      </Button>
    </div>
  )
}

/** For staff lists: "Email not verified" next to someone whose email is not proven (nothing when there is no email) */
export function EmailNotVerifiedBadge({
  email,
  verified,
}: {
  email: string
  verified?: boolean
}) {
  const { t } = useTranslation()
  if (!email || verified) return null
  return (
    <Badge className="border-0 bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
      {t("emailVerify.badge")}
    </Badge>
  )
}
