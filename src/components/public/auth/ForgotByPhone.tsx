import { zodResolver } from "@hookform/resolvers/zod"
import { MessageSquareIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { ErrorAlert, SubmitButton, TextField } from "@/components/global/form"
import { AuthHeading } from "@/components/layout/AuthLayout"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  useCheckResetCode,
  useResetPasswordByPhone,
  useSendPhoneCode,
} from "@/hooks/use-auth"
import { displayPhone, isLaoPhone } from "@/lib/phone"

import { ForgotSteps } from "./ForgotSteps"
import { resetSchema, type ResetValues } from "./schemas"

// the server sends at most one code a minute per phone
const COOLDOWN = 60

/**
 * Forgot password by phone, step by step: the phone (step 1, with the choice above) → the SMS code arrives and is
 * confirmed (steps 2–3) → the new password twice (step 4). A phone without an account gets the same "code sent"
 * answer, and no SMS.
 */
export function ForgotByPhone({ choice }: { choice: React.ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<"phone" | "code" | "password">("phone")
  const [phone, setPhone] = useState("")
  const [phoneError, setPhoneError] = useState<string>()
  const [code, setCode] = useState("")
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])

  const send = useSendPhoneCode({
    onSuccess: () => {
      setWait(COOLDOWN)
      setCode("")
      setStep("code")
    },
  })
  const check = useCheckResetCode({ onSuccess: () => setStep("password") })
  const reset = useResetPasswordByPhone({
    onSuccess: () => {
      toast.success(t("forgotPhone.done"))
      navigate("/login", { replace: true })
    },
  })
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  })
  const sendCode = () => send.mutate({ phone: phone.trim(), purpose: "reset" })

  // step 1: choose phone (above) and type it
  if (step === "phone")
    return (
      <>
        <ForgotSteps step={1} />
        <AuthHeading
          title={t("forgot.title")}
          subtitle={t("forgotPhone.subtitle")}
        />
        {choice}
        <form
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!isLaoPhone(phone)) {
              setPhoneError("validation.phone")
              return
            }
            sendCode()
          }}
        >
          <ErrorAlert error={send.error} />
          <div className="space-y-1.5">
            <Label htmlFor="forgot-phone">{t("fields.phone")}</Label>
            <Input
              id="forgot-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              aria-invalid={!!phoneError}
              onChange={(e) => {
                setPhone(e.target.value)
                setPhoneError(undefined)
              }}
              className="h-12 text-base"
            />
            {phoneError && (
              <p className="text-sm text-destructive">{t(phoneError)}</p>
            )}
          </div>
          <SubmitButton pending={send.isPending}>
            {t("smsCode.send")}
          </SubmitButton>
        </form>
      </>
    )

  // steps 2–3: the SMS arrives, the code is confirmed
  if (step === "code")
    return (
      <>
        <ForgotSteps step={3} />
        <MessageSquareIcon className="mb-4 size-10 text-[var(--primary-ink)]" />
        <AuthHeading
          title={t("forgotPhone.codeTitle")}
          subtitle={t("smsCode.sentToIfAccount", {
            phone: displayPhone(phone.trim()),
          })}
        />
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.length === 6) check.mutate({ phone: phone.trim(), code })
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
            onClick={() => setStep("phone")}
          >
            {t("forgotPhone.changePhone")}
          </button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={send.isPending || wait > 0}
            onClick={sendCode}
          >
            {send.isPending && <Spinner />}
            {wait > 0
              ? t("smsCode.again", { seconds: wait })
              : t("smsCode.resend")}
          </Button>
        </div>
      </>
    )

  // step 4: the new password, twice
  return (
    <>
      <ForgotSteps step={4} />
      <AuthHeading title={t("reset.title")} />
      <form
        noValidate
        className="space-y-5"
        onSubmit={form.handleSubmit((v) =>
          reset.mutate({ phone: phone.trim(), code, password: v.password }),
        )}
      >
        <ErrorAlert error={reset.error} />
        <FieldGroup>
          <TextField
            label={t("fields.newPassword")}
            type="password"
            autoComplete="new-password"
            registration={form.register("password")}
            error={form.formState.errors.password}
          />
          <TextField
            label={t("fields.confirmPassword")}
            type="password"
            autoComplete="new-password"
            registration={form.register("confirm")}
            error={form.formState.errors.confirm}
          />
        </FieldGroup>
        <SubmitButton pending={reset.isPending}>
          {t("reset.submit")}
        </SubmitButton>
      </form>
    </>
  )
}
