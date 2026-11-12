import { MessageCircleIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useBranchWhatsapp } from "@/hooks/use-branch-whatsapp"
import { readOriginSlug } from "@/components/public/booking/origin"

/**
 * "No email, or forgot it? Contact admin": opens WhatsApp to the branch's number with a ready message asking for a new
 * password (an account with only a phone cannot get the reset email). The branch is the one being booked, or the one
 * the customer came from; nothing shows without a branch or without a WhatsApp number.
 */
export function ContactAdmin({
  slug,
  login = "",
}: {
  /** the branch (default: the one the customer came from) */
  slug?: string | null
  /** what the customer typed to log in (their phone), put in the message */
  login?: string
}) {
  const { t } = useTranslation()
  const branch = slug ?? readOriginSlug()
  const number = useBranchWhatsapp(branch)
  if (!branch || !number) return null
  const message = t("login.adminMessage", { login: login.trim() || "-" })
  return (
    <div className="space-y-2 rounded-lg bg-muted/60 p-3 text-sm">
      <p className="text-muted-foreground">{t("login.noEmail")}</p>
      <Button asChild variant="outline" className="h-11 w-full">
        <a
          href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircleIcon />
          {t("login.contactAdmin")}
        </a>
      </Button>
    </div>
  )
}
