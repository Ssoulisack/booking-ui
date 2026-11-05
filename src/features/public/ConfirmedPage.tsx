import { CheckIcon, ClockIcon, CopyIcon, Share2Icon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useLocation } from "react-router"

import { Button } from "@/components/ui/button"
import type { CreatedBooking } from "@/lib/api/types"
import { timeIn } from "@/lib/format"
import { useSession } from "@/stores/session"

import { BookingCard } from "./BookingCard"
import { CancelledNotice } from "./CancelledNotice"
import { CopyCode } from "./CopyCode"
import { EventPayPanel, recallPay } from "./EventPay"
import { PayOnline, payableOnline } from "./PayOnline"
import { StepBar } from "./TableBookingPanel"
import { usePublic } from "./context"
import { useLiveBooking } from "./live-booking"

/** /b/:slug/confirmed — shown once after booking (the booking comes from the checkout) */
export function ConfirmedPage() {
  const { slug } = usePublic()
  const created = (useLocation().state as { booking?: CreatedBooking } | null)
    ?.booking
  if (!created) return <Navigate to={`/b/${slug}`} replace />
  return <Confirmed created={created} />
}

function Confirmed({ created }: { created: CreatedBooking }) {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const user = useSession((s) => s.user)
  // what the page was given may be old (a reload keeps it): the booking is read again while it is open,
  // so an approval, a payment or a cancellation by the team shows up here
  const live = useLiveBooking(slug, created, created.guest_token)
  // the answer to booking also holds the private link and the way to pay: keep those
  const booking: CreatedBooking = { ...created, ...live.data }
  const pending = booking.status === "pending"

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 pt-8 pb-16">
      {/* an event booking is not done until it is paid: step 3 of 3 */}
      {booking.event_id && <StepBar at={3} kind="event" />}
      <div className="space-y-2">
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--brand)] text-[var(--brand-foreground)]">
          <CheckIcon className="size-7" />
        </span>
        <h1 className="display-tight text-4xl">
          {pending ? t("public.requestedTitle") : t("public.bookedTitle")}
        </h1>
        <p className="text-muted-foreground">
          {pending ? t("public.requestedLead") : t("public.bookedLead")}
        </p>
      </div>

      <div className="rounded-xl border-2 border-dashed border-[var(--brand-line)] bg-card px-4 py-5 text-center">
        <p className="text-sm text-muted-foreground">{t("public.showCode")}</p>
        <p className="display-tight text-6xl tracking-wider text-[var(--brand-ink)]">
          {booking.code}
        </p>
        <div className="mt-3 flex justify-center">
          <CopyCode code={booking.code} />
        </div>
      </div>

      {/* a table: when the group must be there, said once and clearly after booking */}
      {booking.arrive_by && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-100">
          <ClockIcon className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="text-lg font-semibold">
              {t("public.tables.arriveByTitle", {
                time: timeIn(booking.arrive_by, business.timezone),
              })}
            </p>
            <p className="text-sm">{t("public.tables.arriveByLead")}</p>
          </div>
        </div>
      )}

      {booking.event_id && (
        <EventPayPanel
          slug={slug}
          tz={business.timezone}
          phone={business.phone}
          booking={booking}
          guestToken={booking.guest_token}
          info={
            booking.pay
              ? {
                  pay: booking.pay,
                  ...(recallPay(slug, booking.id) ?? { event: "", tables: "" }),
                }
              : recallPay(slug, booking.id)
          }
        />
      )}

      {!booking.event_id && payableOnline(booking) && (
        <PayOnline
          slug={slug}
          booking={booking}
          guestToken={booking.guest_token}
        />
      )}

      <BookingCard booking={booking} tz={business.timezone} />

      {booking.guest_link && booking.guest_token && (
        <GuestLink
          link={booking.guest_link}
          path={`/b/${slug}/booking/${booking.guest_token}`}
        />
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {user && !booking.guest_link && (
          <Button asChild size="lg" className="h-12">
            <Link to="/account">{t("nav.myBookings")}</Link>
          </Button>
        )}
        <Button asChild size="lg" variant="outline" className="h-12">
          <Link to={`/b/${slug}#book`}>{t("public.bookAnother")}</Link>
        </Button>
      </div>
      {booking.status === "cancelled" && (
        <CancelledNotice booking={booking} slug={slug} phone={business.phone} />
      )}
    </main>
  )
}

/** The guest's private link: keep it to view or cancel later (path: the same page inside this app) */
function GuestLink({ link, path }: { link: string; path: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== "undefined" && !!navigator.share

  return (
    <section className="space-y-3 rounded-xl bg-[var(--brand-soft)] p-4">
      <h2 className="font-semibold">{t("public.guestLinkTitle")}</h2>
      <p className="text-sm">{t("public.guestLinkLead")}</p>
      <p className="rounded-lg bg-card px-3 py-2 text-sm break-all">{link}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="h-11"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link)
              setCopied(true)
            } catch {
              setCopied(false)
            }
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? t("public.copied") : t("public.copyLink")}
        </Button>
        {canShare && (
          <Button
            variant="outline"
            className="h-11"
            onClick={() => void navigator.share({ url: link }).catch(() => {})}
          >
            <Share2Icon />
            {t("public.shareLink")}
          </Button>
        )}
        <Button asChild variant="outline" className="h-11">
          <Link to={path}>{t("public.openLink")}</Link>
        </Button>
      </div>
    </section>
  )
}
