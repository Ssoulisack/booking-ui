import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"

import { ErrorAlert, SubmitButton, TextField } from "@/components/global/form"
import { AuthHeading } from "@/components/layout/AuthLayout"
import { FieldGroup } from "@/components/ui/field"
import { useRegister, useSmsOn } from "@/hooks/use-auth"
import { displayPhone } from "@/lib/phone"

import { AuthSteps } from "./AuthSteps"
import { IdentityFields } from "./IdentityFields"
import { afterAuthPath, safeNext } from "./landing"
import { PhoneCodeStep } from "./PhoneCodeStep"
import { PhoneStep, ProvedPhone } from "./PhoneStep"
import { registerSchema, type RegisterValues } from "./schemas"
import { SocialButtons } from "./SocialButtons"

const STEPS = [
  "registerSteps.phone",
  "registerSteps.code",
  "registerSteps.details",
]

/**
 * Create an account. With SMS codes on it goes step by step, the usual pattern: 1 the phone → 2 the code texted to it
 * (checked at once) → 3 name, email and password. With SMS codes off: one form, as before.
 */
export function RegisterPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const next = safeNext(params.get("next"))
  const smsOn = useSmsOn()
  const [step, setStep] = useState<"phone" | "code" | "details">("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")

  const footer = (
    <>
      <SocialButtons next={next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("register.haveAccount")}{" "}
        <Link
          to={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("actions.logIn")}
        </Link>
      </p>
    </>
  )

  if (!smsOn)
    return (
      <>
        <AuthHeading
          title={t("register.title")}
          subtitle={t("register.subtitle")}
        />
        <RegisterForm next={next} />
        {footer}
      </>
    )

  if (step === "code")
    return (
      <>
        <AuthSteps step={2} labels={STEPS} />
        <PhoneCodeStep
          phone={phone.trim()}
          purpose="register"
          subtitle={t("smsCode.sentTo", { phone: displayPhone(phone.trim()) })}
          onConfirmed={(right) => {
            setCode(right)
            setStep("details")
          }}
          onChangePhone={() => setStep("phone")}
        />
      </>
    )

  if (step === "details")
    return (
      <>
        <AuthSteps step={3} labels={STEPS} />
        <AuthHeading
          title={t("register.title")}
          subtitle={t("registerSteps.detailsLead")}
        />
        <RegisterForm
          next={next}
          proved={{
            phone: phone.trim(),
            code,
            onChange: () => {
              setCode("")
              setStep("phone")
            },
          }}
        />
      </>
    )

  return (
    <>
      <AuthSteps step={1} labels={STEPS} />
      <AuthHeading
        title={t("register.title")}
        subtitle={t("registerSteps.phoneLead")}
      />
      <PhoneStep
        phone={phone}
        onPhone={setPhone}
        onSent={() => setStep("code")}
      />
      {footer}
    </>
  )
}

/**
 * Name, email, password (and the phone, unless it was already proved with an SMS code: then it is shown, with Change).
 * "confirm" is only checked here: the server gets the password once.
 */
function RegisterForm({
  next,
  proved,
}: {
  next: string | null
  proved?: { phone: string; code: string; onChange: () => void }
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const register = useRegister()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      phone: proved?.phone ?? "",
      email: "",
      password: "",
      confirm: "",
    },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(({ confirm: _confirm, ...values }) =>
    register.mutate(
      {
        ...values,
        email: values.email || undefined,
        ...(proved ? { phone: proved.phone, phone_code: proved.code } : {}),
      },
      { onSuccess: () => navigate(afterAuthPath(next), { replace: true }) },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <ErrorAlert error={register.error} />
      {proved && (
        <ProvedPhone phone={proved.phone} onChange={proved.onChange} />
      )}
      <FieldGroup>
        <TextField
          label={t("fields.name")}
          autoComplete="name"
          registration={form.register("name")}
          error={errors.name}
        />
        <IdentityFields
          register={form.register}
          errors={errors}
          requirePhone
          showPhone={!proved}
        />
        <TextField
          label={t("fields.password")}
          type="password"
          autoComplete="new-password"
          registration={form.register("password")}
          error={errors.password}
        />
        <TextField
          label={t("fields.confirmPassword")}
          type="password"
          autoComplete="new-password"
          registration={form.register("confirm")}
          error={errors.confirm}
        />
      </FieldGroup>
      <SubmitButton pending={register.isPending}>
        {t("register.submit")}
      </SubmitButton>
    </form>
  )
}
