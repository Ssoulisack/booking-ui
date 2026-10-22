import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { MailCheckIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { ErrorAlert, SubmitButton, TextField } from "@/components/form"
import { FieldGroup } from "@/components/ui/field"
import { AuthHeading } from "@/layouts/AuthLayout"

import { authApi } from "../api"
import { forgotSchema, type ForgotValues } from "../schemas"

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const send = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  })
  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  })

  const backLink = (
    <Link
      to="/login"
      className="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
    >
      {t("forgot.backToLogin")}
    </Link>
  )

  // The answer is the same whether or not the account exists
  if (send.isSuccess) {
    return (
      <>
        <MailCheckIcon className="mb-4 size-10 text-primary" />
        <AuthHeading
          title={t("forgot.sentTitle")}
          subtitle={t(`messages.${send.data}`, {
            email: form.getValues("email"),
            defaultValue: send.data,
          })}
        />
        {backLink}
      </>
    )
  }

  return (
    <>
      <AuthHeading title={t("forgot.title")} subtitle={t("forgot.subtitle")} />
      <form
        onSubmit={form.handleSubmit((v) => send.mutate(v.email))}
        noValidate
        className="space-y-5"
      >
        <ErrorAlert error={send.error} />
        <FieldGroup>
          <TextField
            label={t("fields.email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            registration={form.register("email")}
            error={form.formState.errors.email}
          />
        </FieldGroup>
        <SubmitButton pending={send.isPending}>
          {t("forgot.submit")}
        </SubmitButton>
      </form>
      <p className="mt-6 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        {t("forgot.phoneOnly")}
      </p>
      {backLink}
    </>
  )
}
