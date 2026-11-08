import { useState } from "react"
import { useSavePayInfo, useSavePaymentSettings } from "@/hooks/use-payment"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { PageError } from "@/components/global/page-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { PayInfo, PaymentSettings } from "@/types/payment"

import { useBiz } from "@/hooks/use-branch"
import { usePayInfo, usePaymentSettings } from "@/hooks/use-payment"
import { useDashboard } from "../context"
import { ActiveSwitch, ImageField, Panel } from "../ui"

/** Minutes a customer may have to pay once they chose a bank (5 to 30, as the API allows) */
const WINDOWS = [5, 10, 15, 20, 30]

const input = "h-11 text-base lg:h-9 lg:text-sm"

/** How customers pay the branch: which ways are on, the WhatsApp number, the bank QR and the account */
export function PayInfoPanel() {
  const { t } = useTranslation()
  const info = usePayInfo()
  const settings = usePaymentSettings()
  return (
    <Panel title={t("events.pay.title")} lead={t("events.pay.lead")}>
      {info.isPending || settings.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : info.isError ? (
        <PageError error={info.error} onRetry={() => info.refetch()} />
      ) : settings.isError ? (
        <PageError error={settings.error} onRetry={() => settings.refetch()} />
      ) : (
        <PayInfoForm
          key={`${info.dataUpdatedAt}-${settings.dataUpdatedAt}`}
          initial={info.data}
          settings={settings.data}
        />
      )}
    </Panel>
  )
}

function PayInfoForm({
  initial,
  settings,
}: {
  initial: PayInfo
  settings: PaymentSettings
}) {
  const { t } = useTranslation()
  const sport = useDashboard().branch.type === "sport"
  // a restaurant has one switch; a sport branch has two, Booking and Package, grouped under "Pay online"
  const [onlineSwitch, setOnline] = useState(settings.online_enabled)
  const [bookingsOnline, setBookingsOnline] = useState(
    settings.online_enabled && settings.online_bookings,
  )
  const [packagesOnline, setPackagesOnline] = useState(
    settings.online_enabled && settings.online_packages,
  )
  const online = sport ? bookingsOnline || packagesOnline : onlineSwitch
  const [minutes, setMinutes] = useState(settings.charge_minutes)
  const [transfer, setTransfer] = useState(initial.transfer_enabled)
  const [slipWhatsapp, setSlipWhatsapp] = useState(initial.slip_whatsapp)
  const [slipTelegram, setSlipTelegram] = useState(initial.slip_telegram)
  const { id: branchId } = useBiz()
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp)
  const [accountName, setAccountName] = useState(initial.account_name)
  const [accountNumber, setAccountNumber] = useState(initial.account_number)
  const [note, setNote] = useState(initial.note)
  const [qr, setQr] = useState({
    key: initial.qr_key,
    url: initial.qr_url ?? "",
  })
  const infoDirty =
    transfer !== initial.transfer_enabled ||
    slipWhatsapp !== initial.slip_whatsapp ||
    slipTelegram !== initial.slip_telegram ||
    whatsapp !== initial.whatsapp ||
    accountName !== initial.account_name ||
    accountNumber !== initial.account_number ||
    note !== initial.note ||
    qr.key !== initial.qr_key
  const settingsDirty =
    online !== settings.online_enabled ||
    (sport &&
      (bookingsOnline !==
        (settings.online_enabled && settings.online_bookings) ||
        packagesOnline !==
          (settings.online_enabled && settings.online_packages))) ||
    minutes !== settings.charge_minutes
  const savePay = useSavePayInfo()
  const saveSettings = useSavePaymentSettings()
  const pending = savePay.isPending || saveSettings.isPending
  const noWay = !transfer && !(online && settings.gateway_available)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (infoDirty)
        await savePay.mutateAsync({
          whatsapp: whatsapp.trim(),
          note: note.trim(),
          qr_key: qr.key,
          qr_url: qr.url,
          account_name: accountName.trim(),
          account_number: accountNumber.trim(),
          transfer_enabled: transfer,
          slip_whatsapp: slipWhatsapp,
          slip_telegram: slipTelegram,
        })
      if (settingsDirty)
        await saveSettings.mutateAsync({
          online_enabled: online,
          ...(sport
            ? {
                online_bookings: bookingsOnline,
                online_packages: packagesOnline,
              }
            : {}),
          charge_minutes: minutes,
        })
      toast.success(t("events.pay.saved"))
    } catch {
      // the error shows under the form
    }
  }

  return (
    <form noValidate className="space-y-5" onSubmit={submit}>
      <ErrorAlert error={savePay.error ?? saveSettings.error} />

      <div className="space-y-2">
        {sport ? (
          // one block: the "Pay online" title, then a switch for Booking and one for Package
          <div className="space-y-2">
            <div className="px-1">
              <p className="text-sm font-medium">{t("events.pay.online")}</p>
              <p className="text-sm text-muted-foreground">
                {settings.gateway_available
                  ? t("events.pay.onlineHint")
                  : t("events.pay.noGateway")}
              </p>
            </div>
            <div className="space-y-2 pl-3">
              <ActiveSwitch
                id="pay-online-bookings"
                checked={bookingsOnline}
                onChange={setBookingsOnline}
                label={t("events.pay.switchBooking")}
                hint={t("events.pay.switchBookingHint")}
              />
              <ActiveSwitch
                id="pay-online-packages"
                checked={packagesOnline}
                onChange={setPackagesOnline}
                label={t("events.pay.switchPackage")}
                hint={t("events.pay.switchPackageHint")}
              />
            </div>
          </div>
        ) : (
          <ActiveSwitch
            id="pay-online"
            checked={onlineSwitch}
            onChange={setOnline}
            label={t("events.pay.online")}
            hint={
              settings.gateway_available
                ? t("events.pay.onlineHint")
                : t("events.pay.noGateway")
            }
          />
        )}
        {online && settings.gateway_available && (
          <div className="space-y-1.5 rounded-lg border px-3 py-3">
            <Label htmlFor="pay-window">{t("events.pay.window")}</Label>
            {/* a list, not a number box: the phone's own picker */}
            <select
              id="pay-window"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="h-11 w-40 rounded-lg border border-input bg-background px-2.5 text-base lg:h-9 lg:text-sm"
            >
              {[...new Set([...WINDOWS, minutes])]
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>
                    {t("events.pay.windowN", { count: n })}
                  </option>
                ))}
            </select>
            <p className="text-sm text-muted-foreground">
              {t("events.pay.windowHint", { count: minutes })}
            </p>
          </div>
        )}
        <ActiveSwitch
          id="pay-transfer"
          checked={transfer}
          onChange={setTransfer}
          label={t("events.pay.transfer")}
          hint={t("events.pay.transferHint")}
        />
        {noWay && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
            {t("events.pay.noWay")}
          </p>
        )}
      </div>

      {transfer && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pay-wa">{t("events.pay.whatsapp")}</Label>
            <Input
              id="pay-wa"
              type="tel"
              inputMode="tel"
              placeholder="+856 20 5555 1234"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={`${input} max-w-xs`}
            />
            <p className="text-sm text-muted-foreground">
              {t("events.pay.whatsappHint")}
            </p>
          </div>
          <ImageField
            label={t("events.pay.qr")}
            folder="branding"
            url={qr.url}
            onChange={(key, url) => setQr({ key, url })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-account-name">
                {t("events.pay.accountName")}
              </Label>
              <Input
                id="pay-account-name"
                autoComplete="off"
                maxLength={120}
                placeholder={t("events.pay.accountNamePlaceholder")}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className={input}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-account-number">
                {t("events.pay.accountNumber")}
              </Label>
              <Input
                id="pay-account-number"
                inputMode="numeric"
                autoComplete="off"
                maxLength={60}
                placeholder="010-12-00-1234567"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className={input}
              />
            </div>
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">
            {t("events.pay.accountHint")}
          </p>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t("events.pay.slipTitle")}
            </legend>
            <p className="text-sm text-muted-foreground">
              {t("events.pay.slipLead")}
            </p>
            <ActiveSwitch
              id="pay-slip-telegram"
              checked={slipTelegram}
              onChange={setSlipTelegram}
              label={t("events.pay.slipTelegram")}
              hint={t("events.pay.slipTelegramHint")}
            />
            {!initial.telegram_ready && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
                {t("events.pay.slipTelegramNotReady")}{" "}
                <Link
                  to={`/dashboard/${branchId}/telegram`}
                  className="font-medium underline underline-offset-4"
                >
                  {t("events.pay.slipTelegramConnect")}
                </Link>
              </p>
            )}
            <ActiveSwitch
              id="pay-slip-whatsapp"
              checked={slipWhatsapp}
              onChange={setSlipWhatsapp}
              label={t("events.pay.slipWhatsapp")}
              hint={t("events.pay.slipWhatsappHint")}
            />
            {!slipTelegram && !(slipWhatsapp && whatsapp.trim()) && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
                {t("events.pay.slipNone")}
              </p>
            )}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="pay-note">{t("events.pay.note")}</Label>
            <Textarea
              id="pay-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t("events.pay.notePlaceholder")}
            />
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="h-11 lg:h-9"
        disabled={!(infoDirty || settingsDirty) || pending}
      >
        {pending && <Spinner />}
        {t("dash.save")}
      </Button>
    </form>
  )
}
