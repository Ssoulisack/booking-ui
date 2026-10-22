import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"

import { ErrorAlert, SubmitButton, TextField } from "@/components/form"
import { FieldGroup } from "@/components/ui/field"
import { AuthHeading } from "@/layouts/AuthLayout"

import { useRegister } from "../api"
import { IdentityFields } from "../IdentityFields"
import { safeNext } from "../landing"
import { registerSchema, type RegisterValues } from "../schemas"

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
      nationality: "",
      phone: "",
      email: "",
      password: "",
    },
  })
  const { errors } = form.formState
  const nationality = useWatch({ control: form.control, name: "nationality" })

  const onSubmit = form.handleSubmit((values) =>
    register.mutate(
      {
        ...values,
        phone: values.phone || undefined,
        email: values.email || undefined,
      },
      {
        onSuccess: () => navigate(next ?? "/", { replace: true }),
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
          <IdentityFields
            control={form.control}
            register={form.register}
            errors={errors}
            nationality={nationality}
          />
          <TextField
            label={t("fields.password")}
            type="password"
            autoComplete="new-password"
            registration={form.register("password")}
            error={errors.password}
          />
        </FieldGroup>
        <SubmitButton pending={register.isPending}>
          {t("register.submit")}
        </SubmitButton>
      </form>
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
