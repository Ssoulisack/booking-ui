import { KeyRoundIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useChangePassword } from "@/hooks/use-auth"
import type { User } from "@/types/auth"

/**
 * My account → Password: the current password, then the new one twice. An account made with Google / Facebook has
 * none yet: it sets its first one (no current password asked). Other devices are logged out; this one stays.
 */
export function ChangePasswordCard({ user }: { user: User }) {
  const { t } = useTranslation()
  const first = user.has_password === false
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [again, setAgain] = useState("")
  const [mismatch, setMismatch] = useState(false)
  const change = useChangePassword()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (next !== again) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    change.mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: () => {
          toast.success(t("changePassword.done"))
          setCurrent("")
          setNext("")
          setAgain("")
        },
      },
    )
  }

  const field = "h-11 text-base lg:h-9 lg:text-sm"
  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-4 rounded-xl bg-background p-4 ring-1 ring-border sm:p-6"
    >
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <KeyRoundIcon className="size-5 shrink-0" />
          {first ? t("myPassword.setTitle") : t("myPassword.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {first ? t("myPassword.setLead") : t("myPassword.lead")}
        </p>
      </div>
      <ErrorAlert error={change.error} />
      {!first && (
        <div className="space-y-1.5">
          <Label htmlFor="mp-current">{t("myPassword.current")}</Label>
          <Input
            id="mp-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={field}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="mp-new">{t("changePassword.new")}</Label>
        <Input
          id="mp-new"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={field}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mp-again">{t("changePassword.again")}</Label>
        <Input
          id="mp-again"
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
      <Button
        type="submit"
        className="h-11 w-full lg:h-9"
        disabled={change.isPending || (!first && !current) || !next || !again}
      >
        {change.isPending && <Spinner />}
        {t("changePassword.save")}
      </Button>
    </form>
  )
}
