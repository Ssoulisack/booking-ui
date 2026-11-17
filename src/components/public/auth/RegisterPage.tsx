import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"

import { ErrorAlert, SubmitButton, TextField } from "@/components/global/form"
import { FieldGroup } from "@/components/ui/field"
import { AuthHeading } from "@/components/layout/AuthLayout"

import { useRegister } from "@/hooks/use-auth"
import { ForeignerToggle } from "./ForeignerToggle"
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
      foreigner: false,
      phone: "",
      email: "",
      password: "",
      confirm: "",
    },
  })
  const { errors } = form.formState
  // Lao (the default): phone, email optional; a foreigner: email only
  const foreigner = useWatch({ control: form.control, name: "foreigner" })

  // "confirm" is only checked here: the server gets the password once
  const onSubmit = form.handleSubmit(({ confirm: _confirm, ...values }) =>
    register.mutate(
      values.foreigner
        ? {
            name: values.name,
            password: values.password,
            foreigner: true,
            email: values.email,
          }
        : {
            name: values.name,
            password: values.password,
            phone: values.phone,
            email: values.email || undefined,
          },
      {
        onSuccess: () => navigate(afterAuthPath(next), { replace: true }),
      },
    ),
  )

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
          {foreigner ? (
            <TextField
              label={t("fields.email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              registration={form.register("email")}
              error={errors.email}
            />
          ) : (
            <IdentityFields
              register={form.register}
              errors={errors}
              requirePhone
            />
          )}
          <ForeignerToggle
            checked={foreigner}
            onChange={(on) => {
              form.setValue("foreigner", on)
              form.clearErrors(["phone", "email"])
            }}
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
