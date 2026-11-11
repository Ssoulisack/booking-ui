import { zodResolver } from "@hookform/resolvers/zod"
import { MailCheckIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ContactAdmin } from "./ContactAdmin"
import { Link } from "react-router"

import { ErrorAlert, SubmitButton, TextField } from "@/components/global/form"
import { FieldGroup } from "@/components/ui/field"
import { AuthHeading } from "@/components/layout/AuthLayout"

import { useForgotPassword } from "@/hooks/use-auth"
import { forgotSchema, type ForgotValues } from "./schemas"

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const send = useForgotPassword()
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
        <MailCheckIcon className="mb-4 size-10 text-[var(--primary-ink)]" />
        <AuthHeading
          title={t("forgot.sentTitle")}
          subtitle={t(`messages.${send.data}`, {
            email: form.getValues("email"),
            defaultValue: send.data,
          })}
        />
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("forgot.verifiedOnly")}
        </p>
        <div className="mt-3">
          <ContactAdmin />
        </div>
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
        {t("forgot.verifiedOnly")} {t("forgot.phoneOnly")}
      </p>
      <div className="mt-3">
        <ContactAdmin />
      </div>
      {backLink}
    </>
  )
}
