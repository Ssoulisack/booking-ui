import { useState } from "react"
import { useTranslation } from "react-i18next"

import { ErrorAlert } from "@/components/form"
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
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

/** "Cancel booking" with a confirm step and an optional reason */
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
          {/* not AlertDialogAction: it would close the dialog before the answer arrives */}
          <Button
            variant="destructive"
            className="h-11"
            disabled={pending}
            onClick={() => onConfirm(reason.trim())}
          >
            {pending && <Spinner />}
            {t("booking.cancelConfirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
