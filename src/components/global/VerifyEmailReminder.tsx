import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router"
import { toast } from "sonner"

import { EmailVerify } from "@/components/global/EmailVerify"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSession } from "@/stores/session"

const PROFILE = "/account/profile"
// not at once: someone who just registered or logged in first gets on with what they came for
const LATER_MS = 30_000
// pages where a note would get in the way (signing in, choosing a password)
const QUIET = /^\/(login|register|forgot-password|reset-password|invite)(\/|$)/

/**
 * Someone logged in whose email is not verified yet: once per visit, a little while after they arrive, a note with
 * "Verify". Verify opens a small window that sends the code to the email and checks it right there (no leaving the
 * page). Until it is verified, "Forgot password" sends them nothing.
 */
export function VerifyEmailReminder() {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const unverified =
    !!user && !user.email_generated && user.email_verified === false
  const remind =
    unverified &&
    !user.must_change_password &&
    pathname !== PROFILE &&
    !QUIET.test(pathname)
  const key = user ? `verify-email-reminded:${user.id}` : ""

  useEffect(() => {
    if (!remind) return
    try {
      if (sessionStorage.getItem(key)) return
    } catch {
      // no storage: remind anyway
    }
    const id = window.setTimeout(() => {
      try {
        sessionStorage.setItem(key, "1")
      } catch {
        // no storage: it may show again on the next visit, that is fine
      }
      toast.info(t("emailVerify.remind"), {
        id: "verify-email",
        duration: 10_000,
        action: {
          label: t("emailVerify.verify"),
          onClick: () => setOpen(true),
        },
      })
    }, LATER_MS)
    // moving between pages keeps the wait going; a login or password page (or My account) stops it until they leave
    return () => window.clearTimeout(id)
  }, [remind, key, t])

  return (
    // verified (or logged out): the window closes by itself
    <Dialog open={open && unverified} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("emailVerify.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("emailVerify.dialogLead")}</DialogDescription>
        </DialogHeader>
        {open && unverified && <EmailVerify autoSend />}
      </DialogContent>
    </Dialog>
  )
}
