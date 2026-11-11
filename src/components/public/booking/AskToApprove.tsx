import { MessageCircleIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { usePublicPayInfo } from "@/hooks/use-public"
import { money } from "@/lib/format"
import { displayPhone } from "@/lib/phone"
import { useSession } from "@/stores/session"
import type { CustomerPackage } from "@/types/package"

/**
 * A package the customer paid for and sent the slip of, waiting for the team to approve it: a button that opens
 * WhatsApp to the branch with a ready message ("I paid for P-0041 … please approve it"), so the customer only presses
 * send. Nothing shows when the branch has no WhatsApp number.
 */
export function AskToApprove({
  pkg,
  slug,
  className,
}: {
  pkg: CustomerPackage
  slug: string
  className?: string
}) {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const info = usePublicPayInfo(slug).data
  const number = (info?.whatsapp ?? "").replace(/[^\d]/g, "")
  if (!number) return null
  const message = t("packages.my.approveMessage", {
    code: pkg.code,
    name: pkg.name,
    total: money(pkg.price, pkg.currency),
    customer: [user?.name, user?.phone && displayPhone(user.phone)]
      .filter(Boolean)
      .join(", "),
  })
  return (
    <Button asChild variant="outline" className={className ?? "h-11"}>
      <a
        href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircleIcon />
        {t("packages.my.askApprove")}
      </a>
    </Button>
  )
}
