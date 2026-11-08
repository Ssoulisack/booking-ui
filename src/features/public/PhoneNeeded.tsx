import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { authApi, authKeys } from "@/features/auth/api"
import { isLaoPhone } from "@/lib/phone"
import { useSession } from "@/stores/session"

/**
 * Asked only when a booking needs it (event tables): a logged-in customer with no phone number types it here and
 * goes on, with the page and the chosen tables as they were. It is saved to their account like in My account.
 */
export function PhoneNeeded() {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const queryClient = useQueryClient()
  const [phone, setPhone] = useState("")
  const [touched, setTouched] = useState(false)
  const valid = isLaoPhone(phone)
  const save = useMutation({
    mutationFn: () =>
      authApi.updateMe({
        name: user?.name ?? "",
        phone: phone.trim(),
        // a stand-in email is never sent back as if it were real
        email: user && !user.email_generated ? user.email : "",
      }),
    onSuccess: (updated) => {
      useSession.getState().setUser(updated)
      queryClient.setQueryData(authKeys.me, updated)
      toast.success(t("public.events.phoneSaved"))
    },
  })

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (valid) save.mutate()
      }}
      className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-border"
    >
      <div className="space-y-1.5">
        <Label htmlFor="ev-phone-needed">{t("public.events.needsPhone")}</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="ev-phone-needed"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="2055551234"
            value={phone}
            aria-invalid={touched && !valid}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 max-w-56 text-base"
          />
          <Button type="submit" className="h-11" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            {t("public.events.savePhone")}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("identity.phoneLaoHint")}
        </p>
        {touched && !valid && (
          <p role="alert" className="text-sm text-destructive">
            {t("identity.phoneInvalid")}
          </p>
        )}
      </div>
      <ErrorAlert error={save.error} />
    </form>
  )
}
