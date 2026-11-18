import { useTranslation } from "react-i18next"

import { ErrorAlert } from "@/components/global/form"
import SlideCommit from "@/components/reactbits/SlideCommit"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

/**
 * "Wrong bank? Start over": the way to pay is final once a QR is made, so a customer who chose the wrong bank
 * cancels this unpaid booking and books again (the same tables are chosen for them). Slide to confirm: it
 * releases the tables.
 */
export function StartOverDialog({
  onConfirm,
  pending,
  error,
}: {
  onConfirm: () => void
  pending: boolean
  error: unknown
}) {
  const { t } = useTranslation()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-11 w-full">
          {t("payOnline.startOver")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("payOnline.startOverTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("payOnline.startOverLead")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorAlert error={error} />
        {/* stacked on every screen: the hold button has a fixed height and its text never wraps, so it needs the full width */}
        <AlertDialogFooter className="sm:flex-col-reverse">
          <AlertDialogCancel className="h-11 w-full">
            {t("booking.keep")}
          </AlertDialogCancel>
          {/* slide, not tap: the tables are released. Not AlertDialogAction, which would close the dialog
              before the answer arrives; on an error it resets so they can retry */}
          <SlideCommit
            className="w-full"
            label={t("payOnline.startOverSlide")}
            doneLabel={t("booking.cancelling")}
            errorLabel={t("payOnline.startOverSlide")}
            trackColor="#fee2e2"
            labelColor="#991b1b"
            handleColor="#dc2626"
            handleTextColor="#ffffff"
            successColor="#dc2626"
            successTextColor="#ffffff"
            height={56}
            holdMs={1500}
            disabled={pending}
            onConfirm={onConfirm}
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
