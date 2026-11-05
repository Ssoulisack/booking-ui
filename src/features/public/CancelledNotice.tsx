import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Booking } from "@/lib/api/types"

/**
 * A popup for a booking the team cancelled while the customer was looking at it: it says so, shows the
 * reason and the branch phone, and takes them back to the branch page. It cannot be dismissed any other way.
 */
export function CancelledNotice({
  booking,
  slug,
  phone,
}: {
  booking: Booking
  slug: string
  phone: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("public.cancelledNotice.title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>{t("public.cancelledNotice.lead", { code: booking.code })}</p>
              {booking.cancel_reason && (
                <p className="rounded-lg bg-muted/60 p-3 text-foreground">
                  {t("public.cancelledNotice.reason", {
                    reason: booking.cancel_reason,
                  })}
                </p>
              )}
              {phone && <p>{t("public.cancelledNotice.contact", { phone })}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="h-11"
            onClick={() => navigate(`/b/${slug}`, { replace: true })}
          >
            {t("public.cancelledNotice.home")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
