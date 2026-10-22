import { LockIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Area, Choice, ModePicker, Text } from "@/features/settings/fields"
import {
  filledLinks,
  SOCIAL,
  TIMEZONES,
  withCurrent,
} from "@/features/settings/options"
import type {
  BookingMode,
  BranchSettings,
  SettingsInput,
} from "@/lib/api/types"
import { PROVINCES, type Province } from "@/lib/places"

import { manage, useChange, useSettings } from "./api"
import { ActiveSwitch, ImageField, PageHeader, Panel } from "./ui"

/**
 * /dashboard/:id/settings — the branch's own details, and the company settings it may change
 * (owner and admins). Brand, language and currency come from the company settings.
 */
export function SettingsPage() {
  const settings = useSettings()
  if (settings.isPending) return <Skeleton className="h-96 rounded-xl" />
  if (settings.isError)
    return (
      <PageError error={settings.error} onRetry={() => settings.refetch()} />
    )
  return <SettingsForm key={settings.dataUpdatedAt} settings={settings.data} />
}

function SettingsForm({ settings }: { settings: BranchSettings }) {
  const { t } = useTranslation()
  const [f, setF] = useState<SettingsInput>(() => ({
    name: settings.name,
    slug: settings.slug,
    cover_key: settings.cover_key,
    description: settings.description,
    address: settings.address,
    province: settings.province,
    phone: settings.phone,
    map_url: settings.map_url,
    social_links: settings.social_links ?? {},
    timezone: settings.timezone,
    booking_mode: settings.booking_mode,
    booking_policy: settings.booking_policy,
    require_approval: settings.require_approval,
  }))
  const set = (patch: Partial<SettingsInput>) => setF({ ...f, ...patch })
  const save = useChange(manage.saveSettings, ["settings"])
  const slugLocked = !!settings.published_at
  const company = settings.in_force
  const links = f.social_links ?? {}

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    save.mutate(
      { ...f, social_links: filledLinks(links) },
      { onSuccess: () => toast.success(t("settings.saved")) },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("branchSettings.title")}
        lead={t("branchSettings.lead", { company: settings.company_name })}
      />
      <Panel title={t("branchSettings.branch")}>
        <div className="grid gap-4">
          <Text
            id="s-name"
            label={t("branchSettings.name")}
            value={f.name}
            onChange={(v) => set({ name: v })}
          />
          <div className="space-y-1.5">
            <Label htmlFor="s-slug">{t("settings.address")}</Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">
                {window.location.host}/b/
              </span>
              <Input
                id="s-slug"
                value={f.slug}
                disabled={slugLocked}
                onChange={(e) =>
                  set({
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, ""),
                  })
                }
                className="h-11 text-base lg:h-9 lg:text-sm"
              />
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {slugLocked && <LockIcon className="size-3.5" />}
              {slugLocked ? t("settings.slugLocked") : t("settings.slugHint")}
            </p>
          </div>
          <Area
            id="s-desc"
            label={t("settings.description")}
            value={f.description}
            onChange={(v) => set({ description: v })}
          />
          <ImageField
            label={t("branchSettings.photo")}
            folder="branding"
            url={settings.cover_key ? settings.cover_url : ""}
            wide
            onChange={(key) => set({ cover_key: key })}
          />
          <p className="-mt-2 text-sm text-muted-foreground">
            {t("branchSettings.photoHint")}
          </p>
        </div>
      </Panel>

      <Panel title={t("settings.contact")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice
            id="s-province"
            label={t("settings.province")}
            placeholder={t("settings.provinceChoose")}
            hint={t("settings.provinceHint")}
            value={f.province}
            onChange={(v) => set({ province: v as Province })}
            options={PROVINCES.map((p) => ({
              value: p,
              label: t(`provinces.${p}`),
            }))}
          />
          <Text
            id="s-address"
            label={t("settings.streetAddress")}
            value={f.address}
            onChange={(v) => set({ address: v })}
          />
          <Text
            id="s-phone"
            label={t("settings.phone")}
            type="tel"
            value={f.phone}
            onChange={(v) => set({ phone: v })}
          />
          <Text
            id="s-map"
            label={t("settings.mapLink")}
            type="url"
            placeholder="https://maps.google.com/…"
            value={f.map_url}
            onChange={(v) => set({ map_url: v })}
          />
          {SOCIAL.map((name) => (
            <Text
              key={name}
              id={`s-${name}`}
              label={t(`settings.social.${name}`)}
              type="url"
              placeholder="https://…"
              value={links[name] ?? ""}
              onChange={(v) => set({ social_links: { ...links, [name]: v } })}
            />
          ))}
        </div>
      </Panel>

      <Panel
        title={t("branchSettings.overrides")}
        lead={t("branchSettings.overridesLead")}
      >
        <div className="divide-y">
          <Override
            id="o-tz"
            label={t("settings.timezone")}
            companyValue={(company.timezone ?? "").replace("_", " ")}
            own={f.timezone !== null}
            onOwn={(on) =>
              set({ timezone: on ? (f.timezone ?? company.timezone) : null })
            }
          >
            <Choice
              id="s-tz"
              label={t("settings.timezone")}
              value={f.timezone ?? company.timezone}
              onChange={(v) => set({ timezone: v })}
              options={withCurrent(TIMEZONES, f.timezone ?? "").map((z) => ({
                value: z,
                label: z.replace("_", " "),
              }))}
            />
          </Override>
          <Override
            id="o-mode"
            label={t("settings.whoCanBook")}
            companyValue={t(`settings.modes.${company.booking_mode}`)}
            own={f.booking_mode !== null}
            onOwn={(on) =>
              set({
                booking_mode: on
                  ? (f.booking_mode ?? company.booking_mode)
                  : null,
              })
            }
          >
            <ModePicker
              name="booking_mode"
              value={(f.booking_mode ?? company.booking_mode) as BookingMode}
              onChange={(m) => set({ booking_mode: m })}
              hideLegend
            />
          </Override>
          <Override
            id="o-approval"
            label={t("settings.approval")}
            companyValue={
              company.require_approval
                ? t("branchSettings.yes")
                : t("branchSettings.no")
            }
            own={f.require_approval !== null}
            onOwn={(on) =>
              set({
                require_approval: on
                  ? (f.require_approval ?? company.require_approval)
                  : null,
              })
            }
          >
            <ActiveSwitch
              id="s-approval"
              label={t("settings.approval")}
              hint={t("settings.approvalHint")}
              checked={f.require_approval ?? company.require_approval}
              onChange={(v) => set({ require_approval: v })}
            />
          </Override>
          <Override
            id="o-policy"
            label={t("settings.policy")}
            companyValue={company.booking_policy || t("branchSettings.none")}
            own={f.booking_policy !== null}
            onOwn={(on) =>
              set({
                booking_policy: on
                  ? (f.booking_policy ?? company.booking_policy)
                  : null,
              })
            }
          >
            <Area
              id="s-policy"
              label={t("settings.policy")}
              value={f.booking_policy ?? ""}
              onChange={(v) => set({ booking_policy: v })}
              hint={t("settings.policyHint")}
              hideLabel
            />
          </Override>
        </div>
      </Panel>

      <div className="space-y-3">
        <ErrorAlert error={save.error} />
        <Button type="submit" className="h-11 lg:h-9" disabled={save.isPending}>
          {save.isPending && <Spinner />}
          {t("settings.save")}
        </Button>
      </div>
    </form>
  )
}

/**
 * One company setting at this branch: "use the company's" (shown) or the branch's own value.
 * Switching back to the company's clears the branch value.
 */
function Override({
  id,
  label,
  companyValue,
  own,
  onOwn,
  children,
}: {
  id: string
  label: string
  companyValue: string
  own: boolean
  onOwn: (own: boolean) => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          {!own && (
            <p className="text-sm break-words text-muted-foreground">
              {t("branchSettings.companyValue", { value: companyValue })}
            </p>
          )}
        </div>
        <label
          htmlFor={id}
          className="flex shrink-0 items-center gap-2 text-sm"
        >
          {t("branchSettings.ownValue")}
          <Switch id={id} checked={own} onCheckedChange={onOwn} />
        </label>
      </div>
      {own && children}
    </div>
  )
}
