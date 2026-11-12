import { usePublicBranch, usePublicPayInfo } from "@/hooks/use-public"
import { waNumber } from "@/lib/phone"

/**
 * The number a customer writes to on WhatsApp ("Contact admin"): the WhatsApp of the payment settings; without one, the
 * WhatsApp link among the branch's social links; without that, the branch phone. "" when the branch has none of them.
 */
export function useBranchWhatsapp(slug: string | null | undefined): string {
  const enabled = !!slug
  const pay = usePublicPayInfo(slug ?? "", enabled).data
  const branch = usePublicBranch(slug ?? "", enabled).data
  if (!enabled) return ""
  const social = Object.entries(branch?.social_links ?? {}).find(([k]) =>
    k.toLowerCase().includes("whatsapp"),
  )?.[1]
  const fromSocial = social?.match(/(?:wa\.me\/|phone=)\+?(\d{6,})/)?.[1]
  const raw = pay?.whatsapp || fromSocial || branch?.phone || ""
  return raw ? waNumber(raw) : ""
}
