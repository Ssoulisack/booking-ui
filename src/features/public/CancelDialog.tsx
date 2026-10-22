import { useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// long enough not to happen by accident, short enough not to annoy
const HOLD_MS = 1500

/** "Cancel booking" with a confirm step (hold to cancel) and an optional reason */
export function CancelDialog({
  onConfirm,
  pending,
  error,
}: {
  onConfirm: (reason: string) => void
  pending: boolean
  error: unknown
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState("")
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="h-11 w-full sm:w-auto">
          {t("booking.cancel")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("booking.cancelTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("booking.cancelLead")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">{t("booking.reasonOptional")}</Label>
          <Textarea
            id="cancel-reason"
            rows={2}
            maxLength={255}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-base lg:text-sm"
          />
        </div>
        <ErrorAlert error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">
            {t("booking.keep")}
          </AlertDialogCancel>
          {/* hold, not tap: a cancellation cannot be undone. Not AlertDialogAction, which would
              close the dialog before the answer arrives; on an error it resets so they can retry */}
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
            onHold={() => onConfirm(reason.trim())}
          >
            {t("booking.holdToCancel")}
          </HoldButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
