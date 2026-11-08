import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { bookingApi, publicKeys } from "@/features/public/api"

/**
 * "Add a booking": a booking made as a guest joins this account. The server only accepts it when the booking was
 * made with the phone number on the account, so the customer only types the code.
 */
export function AddBookingDialog() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const claim = useMutation({
    mutationFn: (c: string) => bookingApi.claim(c),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: publicKeys.myBookings })
      toast.success(t("account.addDone"))
      setOpen(false)
      setCode("")
    },
  })
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) claim.reset()
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11">
          <PlusIcon />
          {t("account.addBooking")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("account.addTitle")}</DialogTitle>
          <DialogDescription>{t("account.addLead")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim()) claim.mutate(code.trim())
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="claim-code">{t("account.addCode")}</Label>
            <Input
              id="claim-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              className="h-11 text-base uppercase lg:text-sm"
            />
          </div>
          <ErrorAlert error={claim.error} />
          <DialogFooter>
            <Button
              type="submit"
              className="h-11 w-full sm:w-auto"
              disabled={claim.isPending || !code.trim()}
            >
              {claim.isPending && <Spinner />}
              {t("account.addSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
