import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { ErrorAlert, SubmitButton, TextField } from "@/components/global/form"
import { AuthHeading } from "@/components/layout/AuthLayout"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useResetPasswordByPhone, useSendPhoneCode } from "@/hooks/use-auth"
import { displayPhone, isLaoPhone } from "@/lib/phone"

import { ForgotSteps } from "./ForgotSteps"
import { PhoneCodeStep } from "./PhoneCodeStep"
import { resetSchema, type ResetValues } from "./schemas"

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
  const send = useSendPhoneCode({ onSuccess: () => setStep("code") })
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
        <PhoneCodeStep
          phone={phone.trim()}
          purpose="reset"
          subtitle={t("smsCode.sentToIfAccount", {
            phone: displayPhone(phone.trim()),
          })}
          onConfirmed={(right) => {
            setCode(right)
            setStep("password")
          }}
          onChangePhone={() => setStep("phone")}
        />
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
