import { zodResolver } from "@hookform/resolvers/zod"
import { InfoIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"

import { ErrorAlert, SubmitButton, TextField } from "@/components/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FieldGroup } from "@/components/ui/field"
import { AuthHeading } from "@/layouts/AuthLayout"
import { codeMessage } from "@/lib/errors"
import { useSession } from "@/stores/session"

import { useLogin } from "../api"
import { safeNext } from "../landing"
import { loginSchema, type LoginValues } from "../schemas"

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get("next"))
  const endedReason = useSession((s) => s.endedReason)
  const login = useLogin()

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: params.get("email") ?? "", password: "" },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: () => navigate(next ?? "/", { replace: true }),
    }),
  )

  return (
    <>
      <AuthHeading title={t("login.title")} subtitle={t("login.subtitle")} />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {endedReason && !login.error && (
          <Alert>
            <InfoIcon />
            <AlertTitle>{t("login.endedTitle")}</AlertTitle>
            <AlertDescription>{codeMessage(endedReason, t)}</AlertDescription>
          </Alert>
        )}
        <ErrorAlert error={login.error} />
        <FieldGroup>
          <TextField
            label={t("fields.emailOrPhone")}
            autoComplete="username"
            autoCapitalize="none"
            registration={form.register("login")}
            error={errors.login}
          />
          <TextField
            label={t("fields.password")}
            type="password"
            autoComplete="current-password"
            registration={form.register("password")}
            error={errors.password}
          />
        </FieldGroup>
        <div className="text-right text-sm">
          <Link
            to="/forgot-password"
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("login.forgot")}
          </Link>
        </div>
        <SubmitButton pending={login.isPending}>
          {t("login.submit")}
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("login.noAccount")}{" "}
        <Link
          to={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("login.register")}
        </Link>
      </p>
    </>
  )
}
