import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2Icon, DownloadIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { CustomerPackage } from "@/lib/api/types"
import { money } from "@/lib/format"

import {
  packageKeys,
  slipApi,
  usePaymentOptions,
  usePublicPayInfo,
  type SlipInput,
} from "./api"
import { AccountRow } from "./EventPay"
import { PayOnline } from "./PayOnline"
import { saveImage } from "./save-image"
import { SlipSender } from "./SlipSender"

/**
 * Paying for a package the customer bought: online (a bank QR, confirms by itself) or by transfer with the slip
 * (uploaded here or sent on WhatsApp, as the branch chose; the team marks it paid). Once paid it says so.
 */
export function PackagePay({
  slug,
  pkg,
}: {
  slug: string
  pkg: CustomerPackage
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [method, setMethod] = useState<"online" | "manual">("online")
  const hasOnline = !!usePaymentOptions(slug, true).data?.length
  const remote = usePublicPayInfo(slug)
  const slip = useMutation({
    mutationFn: (input: SlipInput) => slipApi.package(pkg.id, input),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: packageKeys.mine })
      if (updated.slip_sent_at) toast.success(t("slip.sentToast"))
    },
  })

  if (pkg.status === "cancelled")
    return (
      <p className="rounded-xl bg-card p-4 ring-1 ring-border">
        {t("packages.my.cancelledNote")}
      </p>
    )
  if (pkg.payment_status === "paid")
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 font-medium text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-200">
        <CheckCircle2Icon className="size-5 shrink-0" />
        {t("packages.my.paidNote")}
      </p>
    )

  const info = remote.data
  const transferOn = info?.transfer_enabled ?? true
  const slipSent = !!pkg.slip_sent_at
  const shown = !hasOnline ? "manual" : !transferOn ? "online" : method
  const whatsapp =
    info && info.slip_whatsapp
      ? (info.whatsapp ?? "").replace(/[^\d]/g, "")
      : ""
  const message = t("packages.my.slipMessage", {
    code: pkg.code,
    name: pkg.name,
    total: money(pkg.price, pkg.currency),
  })

  return (
    <section className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-border">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("packages.my.payTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("packages.my.payLead")}
        </p>
      </div>
      <div className="rounded-lg bg-[var(--brand-soft)] p-3 text-center">
        <p className="text-sm text-muted-foreground">
          {t("public.events.pay.total")}
        </p>
        <p className="display-tight text-4xl text-[var(--brand-ink)]">
          {money(pkg.price, pkg.currency)}
        </p>
      </div>

      {!slipSent && hasOnline && transferOn && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            {t("public.events.pay.method")}
          </legend>
          {(["online", "manual"] as const).map((m) => (
            <label
              key={m}
              className="flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary"
            >
              <input
                type="radio"
                name="package-pay-method"
                checked={method === m}
                onChange={() => setMethod(m)}
                className="mt-1 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">
                  {t(`public.events.pay.methods.${m}`)}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {t(`packages.my.methodHints.${m}`)}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {!slipSent && hasOnline && shown === "online" && (
        <PayOnline slug={slug} pkg={pkg} />
      )}

      {!hasOnline && !transferOn && !slipSent && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
          {t("packages.my.noWay")}
        </p>
      )}

      {transferOn && (shown === "manual" || slipSent) && (
        <>
          {!slipSent && info?.qr_url && (
            <figure className="flex flex-col items-center gap-2">
              <img
                src={info.qr_url}
                alt={t("public.events.pay.scan")}
                className="max-h-72 rounded-lg bg-white p-2"
              />
              <figcaption className="text-sm text-muted-foreground">
                {t("public.events.pay.scan")}
              </figcaption>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={async () => {
                  if (!(await saveImage(info.qr_url!, `pay-${pkg.code}.png`)))
                    window.open(info.qr_url, "_blank")
                }}
              >
                <DownloadIcon />
                {t("payOnline.saveQr")}
              </Button>
            </figure>
          )}
          {!slipSent &&
            (info?.account_name || info?.account_number || info?.note) && (
              <dl className="space-y-3 rounded-lg bg-muted/50 p-3 text-sm">
                {info.account_name && (
                  <AccountRow
                    label={t("public.events.pay.accountName")}
                    value={info.account_name}
                  />
                )}
                {info.account_number && (
                  <AccountRow
                    label={t("public.events.pay.accountNumber")}
                    value={info.account_number}
                    big
                  />
                )}
                {info.note && (
                  <AccountRow
                    label={t("public.events.pay.accountNote")}
                    value={info.note}
                    multiline
                  />
                )}
              </dl>
            )}
          <SlipSender
            telegram={info?.slip_telegram ?? false}
            whatsappNumber={whatsapp}
            message={message}
            sentAt={pkg.slip_sent_at}
            sentVia={pkg.slip_via}
            pending={slip.isPending}
            error={slip.error}
            onSend={(input) => slip.mutateAsync(input)}
          />
          {!slipSent && !info?.slip_telegram && !whatsapp && (
            <p className="text-sm text-muted-foreground">
              {t("packages.my.tellDesk", { code: pkg.code })}
            </p>
          )}
        </>
      )}
    </section>
  )
}
