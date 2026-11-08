import { useQueryClient } from "@tanstack/react-query"
import { useCancelFoundBooking, useFindBooking } from "@/hooks/use-public"
import { ArrowLeftIcon, SearchIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import type { Booking } from "@/types/booking"
import { dayIn, timeIn } from "@/lib/format"

import { BookingCard } from "./BookingCard"
import { canCancel } from "./booking-utils"
import { CancelDialog } from "./CancelDialog"
import { usePublic } from "./context"

/** /b/:slug/find — a guest without the private link finds the booking by its code and phone */
export function FindBookingPage() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const queryClient = useQueryClient()
  const [code, setCode] = useState("")
  const [phone, setPhone] = useState("")
  const [booking, setBooking] = useState<Booking | null>(null)
  const tz = business.timezone

  const find = useFindBooking(slug, { onSuccess: setBooking })
  const cancel = useCancelFoundBooking(slug, {
    onSuccess: (updated) => {
      setBooking(updated)
      void queryClient.invalidateQueries({ queryKey: ["public", slug] })
      toast.success(t("booking.cancelled"))
    },
  })

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 pt-4 pb-16">
      <Button asChild variant="ghost" className="-ml-3 h-11">
        <Link to={`/b/${slug}`}>
          <ArrowLeftIcon />
          {t("public.tables.back")}
        </Link>
      </Button>
      <div className="space-y-1">
        <h1 className="display-tight text-4xl">{t("public.find.title")}</h1>
        <p className="text-muted-foreground">{t("public.find.lead")}</p>
      </div>

      <form
        noValidate
        className="space-y-4 rounded-xl bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault()
          setBooking(null)
          find.mutate({ code: code.trim(), phone: phone.trim() })
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="find-code">{t("public.find.code")}</Label>
          <Input
            id="find-code"
            value={code}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="J6WY282K"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="h-12 text-lg tracking-wider uppercase"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="find-phone">{t("public.find.phone")}</Label>
          <Input
            id="find-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 text-base"
          />
          <p className="text-sm text-muted-foreground">
            {t("public.find.phoneHint")}
          </p>
        </div>
        <ErrorAlert error={find.error} />
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full bg-[var(--brand)] text-base text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
          disabled={find.isPending || !code.trim() || !phone.trim()}
        >
          {find.isPending ? <Spinner /> : <SearchIcon />}
          {t("public.find.submit")}
        </Button>
      </form>

      {booking && (
        <BookingCard booking={booking} tz={tz}>
          <div className="mt-4 border-t pt-4">
            {canCancel(booking) ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t("booking.cancelUntil", {
                    when: `${dayIn(booking.cancellable_until, tz)}, ${timeIn(booking.cancellable_until, tz)}`,
                  })}
                </p>
                <CancelDialog
                  visitReturns={!!booking.package}
                  pending={cancel.isPending}
                  error={cancel.error}
                  onConfirm={(reason) =>
                    cancel.mutate({
                      code: code.trim(),
                      phone: phone.trim(),
                      reason,
                    })
                  }
                />
              </div>
            ) : (
              booking.status !== "cancelled" && (
                <p className="text-sm text-muted-foreground">
                  {t("booking.tooLateToCancel", { phone: business.phone })}
                </p>
              )
            )}
          </div>
        </BookingCard>
      )}
    </main>
  )
}
