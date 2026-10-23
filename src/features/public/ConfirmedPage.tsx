import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useLocation } from "react-router"

import { Button } from "@/components/ui/button"
import type { CreatedBooking } from "@/lib/api/types"
import { useSession } from "@/stores/session"

import { BookingCard } from "./BookingCard"
import { usePublic } from "./context"

/** /b/:slug/confirmed — shown once after booking (the booking comes from the checkout) */
export function ConfirmedPage() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const user = useSession((s) => s.user)
  const booking = (useLocation().state as { booking?: CreatedBooking } | null)
    ?.booking

  if (!booking) return <Navigate to={`/b/${slug}`} replace />
  const pending = booking.status === "pending"

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 pt-8 pb-16">
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

      <div className="rounded-xl border-2 border-dashed border-[var(--brand-line)] bg-white px-4 py-5 text-center">
        <p className="text-sm text-muted-foreground">{t("public.showCode")}</p>
        <p className="display-tight text-6xl tracking-wider text-[var(--brand-ink)]">
          {booking.code}
        </p>
      </div>

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
      <p className="rounded-lg bg-white px-3 py-2 text-sm break-all">{link}</p>
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
