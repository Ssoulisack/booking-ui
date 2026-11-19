import { zodResolver } from "@hookform/resolvers/zod"
import { MailCheckIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ContactAdmin } from "./ContactAdmin"
import { Link } from "react-router"

import { ErrorAlert, SubmitButton, TextField } from "@/components/global/form"
import { FieldGroup } from "@/components/ui/field"
import { AuthHeading } from "@/components/layout/AuthLayout"

import { useForgotPassword, useSmsOn } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

import { ForgotByPhone } from "./ForgotByPhone"
import { forgotSchema, type ForgotValues } from "./schemas"

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const send = useForgotPassword()
  // SMS codes on: reset by phone too (first, the customer's identity is the phone)
  const smsOn = useSmsOn()
  const [by, setBy] = useState<"phone" | "email">("phone")
  const byPhone = smsOn && by === "phone"
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

  // email: the link is on its way; the new password is chosen on the link's page (no steps: only phone has them)
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
          {t("forgotPhone.followLink")} {t("forgot.verifiedOnly")}
        </p>
        {/* a new sending domain can land in spam: say where else to look */}
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 ring-1 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-100 dark:ring-amber-400/30">
          {t("emailSpam")}
        </p>
        <div className="mt-3">
          <ContactAdmin />
        </div>
        {backLink}
      </>
    )
  }

  // phone or email (SMS codes on); phone goes on step by step in ForgotByPhone
  const choice = smsOn && (
    <div
      role="tablist"
      className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
    >
      {(["phone", "email"] as const).map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={by === k}
          onClick={() => setBy(k)}
          className={cn(
            "h-10 rounded-lg text-sm font-semibold transition-colors",
            by === k
              ? "bg-[var(--brand)] text-[var(--brand-foreground)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(k === "phone" ? "forgotPhone.byPhone" : "forgotPhone.byEmail")}
        </button>
      ))}
    </div>
  )

  if (byPhone)
    return (
      <>
        <ForgotByPhone choice={choice} />
        {backLink}
      </>
    )

  return (
    <>
      <AuthHeading title={t("forgot.title")} subtitle={t("forgot.subtitle")} />
      {choice}
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
        {/* with SMS codes on, a phone-only account resets by phone instead of asking the staff */}
        {t("forgot.verifiedOnly")} {!smsOn && t("forgot.phoneOnly")}
      </p>
      <div className="mt-3">
        <ContactAdmin />
      </div>
      {backLink}
    </>
  )
}
