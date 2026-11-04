import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BanknoteIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  SmartphoneIcon,
} from "lucide-react"
import QRCode from "qrcode"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { Booking, OnlinePayment, PaymentOption } from "@/lib/api/types"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"

import { payApi, publicKeys, usePaymentOptions } from "./api"

type Who = { token: string } | { bookingId: number }

/** Whether a booking can be paid online now: something to pay, not paid, not cancelled */
export function payableOnline(b: Booking) {
  return (
    b.total_price > 0 &&
    b.payment_status === "unpaid" &&
    (b.status === "pending" || b.status === "confirmed")
  )
}

/**
 * Pay a booking online: pick a bank (or the payment page), scan the QR or open the bank app, and the
 * page waits until the gateway says it is paid. Shows nothing when the branch has no online payment.
 * The booking confirms itself: no slip and no staff step.
 */
export function PayOnline({
  slug,
  booking,
  guestToken,
  onPaid,
}: {
  slug: string
  booking: Booking
  guestToken?: string
  onPaid?: () => void
}) {
  const { t } = useTranslation()
  const options = usePaymentOptions(slug)
  const who: Who = guestToken
    ? { token: guestToken }
    : { bookingId: booking.id }
  const queryClient = useQueryClient()
  const [payment, setPayment] = useState<OnlinePayment | null>(null)

  const start = useMutation({
    mutationFn: (p: { provider: string; method: string }) =>
      payApi.start(slug, who, p),
    onSuccess: setPayment,
  })

  // the page does not wait for the webhook: it asks every few seconds while the payment is open
  const check = useQuery({
    queryKey: ["public", slug, "payment", payment?.id],
    queryFn: () => payApi.check(slug, who, payment!.id),
    enabled: !!payment && payment.status === "pending",
    refetchInterval: 3000,
  })
  const current = check.data ?? payment
  const paid = current?.status === "paid"

  useEffect(() => {
    if (!paid) return
    if (guestToken)
      void queryClient.invalidateQueries({
        queryKey: publicKeys.guestBooking(slug, guestToken),
      })
    void queryClient.invalidateQueries({ queryKey: publicKeys.myBookings })
    onPaid?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid])

  if (!options.data?.length) return null
  if (paid)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 font-medium text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-200">
        <CheckCircle2Icon className="size-5 shrink-0" />
        {t("payOnline.paid")}
      </p>
    )

  return (
    <section className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-border">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BanknoteIcon className="size-5" />
          {t("payOnline.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("payOnline.lead", {
            total: money(booking.total_price, booking.currency),
          })}
        </p>
      </div>

      {current && current.status === "pending" ? (
        <Charge
          payment={current}
          onChange={() => {
            setPayment(null)
            start.reset()
          }}
        />
      ) : (
        <>
          {current && <Ended payment={current} />}
          <Methods
            options={options.data}
            pending={start.isPending}
            onPick={(provider, method) => start.mutate({ provider, method })}
          />
          <ErrorAlert error={start.error} />
        </>
      )}
    </section>
  )
}

/** Banks with a logo in public/banks (STB has none yet: its name is shown) */
const LOGOS = new Set(["apb", "bcel", "ib", "jdb", "ldb", "m-money"])

/** Choose the bank */
function Methods({
  options,
  pending,
  onPick,
}: {
  options: PaymentOption[]
  pending: boolean
  onPick: (provider: string, method: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("payOnline.choose")}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.flatMap((o) =>
          o.methods.map((m) => (
            <Button
              key={`${o.provider}-${m.key}`}
              type="button"
              variant="outline"
              className={cn(
                "h-auto min-h-12 flex-col gap-0.5 py-2 text-center whitespace-normal",
                m.key === "link" && "col-span-2",
              )}
              disabled={pending}
              onClick={() => onPick(o.provider, m.key)}
            >
              {pending ? <Spinner /> : null}
              {LOGOS.has(m.key) && (
                <img
                  src={`/banks/${m.key}.png`}
                  alt=""
                  className="h-8 w-auto max-w-full object-contain"
                  loading="lazy"
                />
              )}
              <span
                className={cn(
                  "font-semibold",
                  LOGOS.has(m.key) && "text-xs font-medium",
                )}
              >
                {m.key === "link" ? t("payOnline.otherBank") : m.label}
              </span>
              {m.key === "link" && (
                <span className="text-xs font-normal text-muted-foreground">
                  {t("payOnline.otherBankHint")}
                </span>
              )}
            </Button>
          )),
        )}
      </div>
    </div>
  )
}

/** The open payment: the QR, the bank-app link, the time left, and a way to change bank */
function Charge({
  payment: p,
  onChange,
}: {
  payment: OnlinePayment
  onChange: () => void
}) {
  const { t } = useTranslation()
  const [qr, setQr] = useState("")
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    if (p.qr_code)
      void QRCode.toDataURL(p.qr_code, { margin: 1, width: 320 }).then(
        (url) => alive && setQr(url),
      )
    return () => {
      alive = false
    }
  }, [p.qr_code])
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const left = Math.max(Math.floor((Date.parse(p.expires_at) - now) / 1000), 0)
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[var(--brand-soft)] p-3 text-center">
        <p className="text-sm text-muted-foreground">{t("payOnline.amount")}</p>
        <p className="display-tight text-4xl text-[var(--brand-ink)]">
          {money(p.amount, p.currency)}
        </p>
      </div>
      {qr && (
        <figure className="flex flex-col items-center gap-2">
          <img
            src={qr}
            alt={t("payOnline.scan")}
            className="size-64 rounded-lg bg-white p-2"
          />
          <figcaption className="text-sm text-muted-foreground">
            {t("payOnline.scan")}
          </figcaption>
        </figure>
      )}
      <div className="grid gap-2">
        {p.deeplink && (
          <Button asChild size="lg" className="h-12 text-base">
            <a href={p.deeplink}>
              <SmartphoneIcon />
              {t("payOnline.openApp")}
            </a>
          </Button>
        )}
        {p.redirect_url && (
          <Button asChild size="lg" className="h-12 text-base">
            <a href={p.redirect_url} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              {t("payOnline.openPage")}
            </a>
          </Button>
        )}
      </div>
      <p
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        aria-live="polite"
      >
        <Spinner />
        {left > 0
          ? t("payOnline.waiting", { time: mmss })
          : t("payOnline.timeUp")}
      </p>
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full"
        onClick={onChange}
      >
        {t("payOnline.changeBank")}
      </Button>
    </div>
  )
}

/** A payment that ended without being paid */
function Ended({ payment: p }: { payment: OnlinePayment }) {
  const { t } = useTranslation()
  const key =
    p.status === "expired"
      ? "expired"
      : p.status === "failed"
        ? "failed"
        : "review"
  return (
    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
      {t(`payOnline.ended.${key}`)}
    </p>
  )
}
