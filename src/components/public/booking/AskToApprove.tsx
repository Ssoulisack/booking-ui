import { MessageCircleIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useBranchWhatsapp } from "@/hooks/use-branch-whatsapp"
import { money } from "@/lib/format"
import { displayPhone } from "@/lib/phone"
import { useSession } from "@/stores/session"
import type { Booking } from "@/types/booking"
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
  const message = t("packages.my.approveMessage", {
    code: pkg.code,
    name: pkg.name,
    total: money(pkg.price, pkg.currency),
    customer: [user?.name, user?.phone && displayPhone(user.phone)]
      .filter(Boolean)
      .join(", "),
  })
  return <ContactBranch slug={slug} message={message} className={className} />
}

/**
 * The same for event tables: booked, slip sent, the team has not confirmed the payment yet. The message names the
 * booking, the event, the tables and the amount; the customer is the account, or the guest who booked.
 */
export function AskToApproveTables({
  booking,
  slug,
  event,
  tables,
  className,
}: {
  booking: Booking
  slug: string
  event: string
  tables: string
  className?: string
}) {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const name = booking.guest_name || booking.customer_name || user?.name
  const phone = booking.guest_phone || booking.customer_phone || user?.phone
  const message = t("public.events.pay.approveMessage", {
    code: booking.code,
    event,
    tables,
    total: money(booking.total_price, booking.currency),
    customer: [name, phone && displayPhone(phone)].filter(Boolean).join(", "),
  })
  return <ContactBranch slug={slug} message={message} className={className} />
}

/** "Contact admin": WhatsApp to the branch's number with the message filled in (nothing without a number) */
function ContactBranch({
  slug,
  message,
  className,
}: {
  slug: string
  message: string
  className?: string
}) {
  const { t } = useTranslation()
  const number = useBranchWhatsapp(slug)
  if (!number) return null
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
