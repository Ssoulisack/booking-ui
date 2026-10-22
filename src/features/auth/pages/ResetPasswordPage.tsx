import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"

import { ErrorAlert, SubmitButton, TextField } from "@/components/form"
import { FieldGroup } from "@/components/ui/field"
import { AuthHeading } from "@/layouts/AuthLayout"
import { useSession } from "@/stores/session"

import { authApi } from "../api"
import { resetSchema, type ResetValues } from "../schemas"

/** Opened from the reset email: /reset-password/{token} */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { token = "" } = useParams()
  const navigate = useNavigate()
  const reset = useMutation({
    mutationFn: (password: string) => authApi.resetPassword(token, password),
    onSuccess: (message) => {
      // the new password revokes every existing login, including this browser's
      useSession.getState().signOut()
      toast.success(t(`messages.${message}`, { defaultValue: message }))
      navigate("/login", { replace: true })
    },
  })
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  })
  const { errors } = form.formState

  return (
    <>
      <AuthHeading title={t("reset.title")} />
      <form
        onSubmit={form.handleSubmit((v) => reset.mutate(v.password))}
        noValidate
        className="space-y-5"
      >
        <ErrorAlert error={reset.error} />
        <FieldGroup>
          <TextField
            label={t("fields.newPassword")}
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
        <SubmitButton pending={reset.isPending}>
          {t("reset.submit")}
        </SubmitButton>
      </form>
    </>
  )
}
