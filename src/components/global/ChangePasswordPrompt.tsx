import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { EmailVerify } from "@/components/global/EmailVerify"
import { ErrorAlert } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useChangePassword } from "@/hooks/use-auth"
import { useSession } from "@/stores/session"

/**
 * After logging in with a password the team set (the person had no email to reset it): a popup they cannot close
 * asks them to choose their own password and, when the account has no real email, to add one, so next time they can
 * reset it themselves. The server checks the same. "Log out" is the only other way out.
 */
export function ChangePasswordPrompt() {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const signOut = useSession((s) => s.signOut)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [again, setAgain] = useState("")
  const [email, setEmail] = useState("")
  const [mismatch, setMismatch] = useState(false)
  const change = useChangePassword()
  // after saving with a new email: the code to verify it (verifying later is fine)
  const [verifying, setVerifying] = useState(false)
  if (verifying)
    return (
      <Dialog open onOpenChange={(o) => !o && setVerifying(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("emailVerify.title")}</DialogTitle>
            <DialogDescription>{t("emailVerify.lead")}</DialogDescription>
          </DialogHeader>
          <EmailVerify autoSend />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 lg:h-9"
              onClick={() => setVerifying(false)}
            >
              {user?.email_verified
                ? t("emailVerify.close")
                : t("emailVerify.later")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  if (!user?.must_change_password) return null
  const needsEmail = user.email_generated

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (next !== again) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    change.mutate(
      {
        current_password: current,
        new_password: next,
        ...(needsEmail && { email: email.trim() }),
      },
      {
        onSuccess: () => {
          toast.success(t("changePassword.done"))
          if (needsEmail) setVerifying(true)
        },
      },
    )
  }

  const field = "h-11 text-base lg:h-9 lg:text-sm"
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{t("changePassword.title")}</DialogTitle>
          <DialogDescription>{t("changePassword.lead")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <ErrorAlert error={change.error} />
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">{t("changePassword.current")}</Label>
            <Input
              id="cp-current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={field}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">{t("changePassword.new")}</Label>
            <Input
              id="cp-new"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={field}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-again">{t("changePassword.again")}</Label>
            <Input
              id="cp-again"
              type="password"
              autoComplete="new-password"
              value={again}
              aria-invalid={mismatch || undefined}
              onChange={(e) => setAgain(e.target.value)}
              className={field}
            />
            {mismatch && (
              <p className="text-sm text-destructive">
                {t("changePassword.mismatch")}
              </p>
            )}
          </div>
          {needsEmail && (
            <div className="space-y-1.5 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200 dark:bg-amber-400/15 dark:ring-amber-400/30">
              <Label htmlFor="cp-email">
                {t("changePassword.emailRequired")}
              </Label>
              <p className="text-sm text-amber-950 dark:text-amber-100">
                {t("changePassword.emailWhy")}
              </p>
              <Input
                id="cp-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 lg:h-9"
              onClick={() => signOut()}
            >
              {t("changePassword.logOut")}
            </Button>
            <Button
              type="submit"
              className="h-11 lg:h-9"
              disabled={
                change.isPending ||
                !current ||
                !next ||
                !again ||
                (needsEmail && !email.trim())
              }
            >
              {change.isPending && <Spinner />}
              {t("changePassword.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
