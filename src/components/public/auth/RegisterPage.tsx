import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"

import { ErrorAlert, SubmitButton, TextField } from "@/components/global/form"
import { PhoneCodeField } from "@/components/global/PhoneCodeField"
import { useSmsOn } from "@/hooks/use-auth"
import { FieldGroup } from "@/components/ui/field"
import { AuthHeading } from "@/components/layout/AuthLayout"

import { useRegister } from "@/hooks/use-auth"
import { IdentityFields } from "./IdentityFields"
import { afterAuthPath, safeNext } from "./landing"
import { SocialButtons } from "./SocialButtons"
import { registerSchema, type RegisterValues } from "./schemas"

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get("next"))
  const register = useRegister()

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      confirm: "",
    },
  })
  const { errors } = form.formState
  const phone = useWatch({ control: form.control, name: "phone" }) ?? ""
  // SMS codes on: the phone is proved with the code texted to it
  const smsOn = useSmsOn()
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState<string>()

  // "confirm" is only checked here: the server gets the password once
  const onSubmit = form.handleSubmit(({ confirm: _confirm, ...values }) => {
    if (smsOn && code.length !== 6) {
      setCodeError("smsCode.required")
      return
    }
    register.mutate(
      {
        ...values,
        phone: values.phone,
        email: values.email || undefined,
        ...(smsOn ? { phone_code: code } : {}),
      },
      {
        onSuccess: () => navigate(afterAuthPath(next), { replace: true }),
      },
    )
  })

  return (
    <>
      <AuthHeading
        title={t("register.title")}
        subtitle={t("register.subtitle")}
      />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <ErrorAlert error={register.error} />
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
          />
          <PhoneCodeField
            phone={phone}
            purpose="register"
            value={code}
            onChange={(v) => {
              setCode(v)
              setCodeError(undefined)
            }}
            error={codeError}
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
}
