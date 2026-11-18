import { useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

/** "Cancel booking" with a confirm step (hold to cancel) and an optional reason */
export function CancelDialog({
  onConfirm,
  pending,
  error,
  visitReturns = false,
}: {
  /** the booking was paid with a package: say the visit goes back */
  visitReturns?: boolean
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
            {visitReturns && ` ${t("booking.cancelPackageNote")}`}
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
          {/* slide, not tap: a cancellation cannot be undone. Not AlertDialogAction, which would
              close the dialog before the answer arrives; on an error it resets so they can retry */}
          <SlideCommit
            className="w-full sm:w-auto"
            label={t("booking.slideToCancel")}
            doneLabel={t("booking.cancelling")}
            errorLabel={t("booking.slideToCancel")}
            trackColor="#fee2e2"
            labelColor="#991b1b"
            handleColor="#dc2626"
            handleTextColor="#ffffff"
            successColor="#dc2626"
            successTextColor="#ffffff"
            height={56}
            holdMs={1500}
            disabled={pending}
            onConfirm={() => onConfirm(reason.trim())}
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
