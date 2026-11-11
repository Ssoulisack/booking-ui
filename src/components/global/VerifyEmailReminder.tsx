import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router"
import { toast } from "sonner"

import { useSession } from "@/stores/session"

const PROFILE = "/account/profile"

/**
 * Someone logged in whose email is not verified yet: once per visit, a note with "Verify" (My account). Until it is
 * verified, "Forgot password" sends them nothing.
 */
export function VerifyEmailReminder() {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const remind =
    !!user &&
    !user.email_generated &&
    user.email_verified === false &&
    !user.must_change_password &&
    pathname !== PROFILE
  const key = user ? `verify-email-reminded:${user.id}` : ""

  useEffect(() => {
    if (!remind) return
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {
      // no storage: remind anyway
    }
    toast.info(t("emailVerify.remind"), {
      id: "verify-email",
      duration: 10_000,
      action: {
        label: t("emailVerify.verify"),
        onClick: () => navigate(PROFILE),
      },
    })
  }, [remind, key, navigate, t])

  return null
}
