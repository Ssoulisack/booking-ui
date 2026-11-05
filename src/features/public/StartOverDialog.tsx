import { useTranslation } from "react-i18next"

import { ErrorAlert } from "@/components/form"
import HoldButton from "@/components/reactbits/HoldButton"
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

// long enough not to happen by accident, short enough not to annoy
const HOLD_MS = 1500

/**
 * "Wrong bank? Start over": the way to pay is final once a QR is made, so a customer who chose the wrong bank
 * cancels this unpaid booking and books again (the same tables are chosen for them). Hold to confirm: it
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
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">
            {t("booking.keep")}
          </AlertDialogCancel>
          {/* hold, not tap: the tables are released. Not AlertDialogAction, which would close the dialog
              before the answer arrives; on an error it resets so they can retry */}
          <HoldButton
            className="w-full sm:w-auto"
            backgroundColor="#fee2e2"
            textColor="#991b1b"
            fillColor="#dc2626"
            fillTextColor="#ffffff"
            radius={10}
            holdTime={HOLD_MS}
            resetAfter={1500}
            disabled={pending}
            doneLabel={t("booking.cancelling")}
            hint={t("booking.holdHint", { seconds: HOLD_MS / 1000 })}
            onHold={onConfirm}
          >
            {t("payOnline.startOverHold")}
          </HoldButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
