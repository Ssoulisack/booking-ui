import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router"

import { ErrorAlert, SubmitButton, TextField } from "@/components/global/form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { useLogin } from "@/hooks/use-auth"

import { SocialButtons } from "./SocialButtons"
import { loginSchema, type LoginValues } from "./schemas"

/**
 * Log in without leaving the page (e.g. the confirm step of a booking): on success the popup closes and the page goes on
 * as the logged-in customer, everything chosen kept. Google / Facebook come back to this same page. Registering opens
 * the register page, which also returns here.
 */
export function LoginDialog({
  open,
  onClose,
  login: prefill = "",
}: {
  open: boolean
  onClose: () => void
  /** what to put in "Email or phone" (the phone the guest typed) */
  login?: string
}) {
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const here = pathname + search
  const login = useLogin()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    values: { login: prefill, password: "" },
  })
  const { errors } = form.formState

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          login.reset()
          onClose()
        }
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("login.title")}</DialogTitle>
          <DialogDescription>{t("login.keepBooking")}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-5"
          onSubmit={form.handleSubmit((values) =>
            login.mutate(values, { onSuccess: onClose }),
          )}
        >
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
        <SocialButtons next={here} />
        <p className="text-center text-sm text-muted-foreground">
          {t("login.noAccount")}{" "}
          <Link
            to={`/register?next=${encodeURIComponent(here)}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t("login.register")}
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  )
}
