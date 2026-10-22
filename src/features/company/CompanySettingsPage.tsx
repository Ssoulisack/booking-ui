import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  ActiveSwitch,
  ImageField,
  PageHeader,
  Panel,
} from "@/features/dashboard/ui"
import { RuleForm } from "@/features/dashboard/setup/RuleEditor"
import { DEFAULT_BRAND } from "@/features/public/brand"
import {
  Area,
  BrandColor,
  Choice,
  ModePicker,
  Text,
} from "@/features/settings/fields"
import {
  CURRENCIES,
  filledLinks,
  LANGUAGES,
  SOCIAL,
  TIMEZONES,
  withCurrent,
} from "@/features/settings/options"
import type { Company, CompanyInput, EffectiveRule } from "@/lib/api/types"

import {
  useCompany,
  useCompanyRule,
  useSetCompanyRule,
  useUpdateCompany,
} from "./api"

/** /company/settings — the brand and the settings every branch starts from */
export function CompanySettingsPage() {
  const company = useCompany()
  if (company.isPending) return <Skeleton className="h-96 rounded-xl" />
  if (company.isError)
    return <PageError error={company.error} onRetry={() => company.refetch()} />
  return <CompanyForm key={company.dataUpdatedAt} company={company.data} />
}

function CompanyForm({ company }: { company: Company }) {
  const { t } = useTranslation()
  const [f, setF] = useState<CompanyInput>(() => ({
    name: company.name,
    logo_key: company.logo_key,
    cover_key: company.cover_key,
    brand_color: company.brand_color || DEFAULT_BRAND,
    description: company.description,
    phone: company.phone,
    email: company.email,
    social_links: company.social_links ?? {},
    language: company.language,
    currency: company.currency,
    timezone: company.timezone,
    booking_mode: company.booking_mode,
    booking_policy: company.booking_policy,
    require_approval: company.require_approval,
  }))
  const set = (patch: Partial<CompanyInput>) => setF({ ...f, ...patch })
  const save = useUpdateCompany()
  const links = f.social_links ?? {}

  return (
    <form
      noValidate
      className="mx-auto max-w-3xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate(
          { ...f, social_links: filledLinks(links) },
          { onSuccess: () => toast.success(t("settings.saved")) },
        )
      }}
    >
      <PageHeader
        title={t("nav.companySettings")}
        lead={t("company.settingsLead")}
      />
      <Panel title={t("company.brand")} lead={t("settings.brandingLead")}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Text
              id="c-name"
              label={t("company.name")}
              value={f.name}
              onChange={(v) => set({ name: v })}
            />
          </div>
          <div className="md:col-span-2">
            <Area
              id="c-desc"
              label={t("settings.description")}
              value={f.description}
              onChange={(v) => set({ description: v })}
            />
          </div>
          <ImageField
            label={t("settings.logo")}
            folder="branding"
            base="/company"
            url={company.logo_url}
            onChange={(key) => set({ logo_key: key })}
          />
          <ImageField
            label={t("settings.cover")}
            folder="branding"
            base="/company"
            url={company.cover_url}
            wide
            onChange={(key) => set({ cover_key: key })}
          />
          <div className="md:col-span-2">
            <BrandColor
              value={f.brand_color}
              onChange={(v) => set({ brand_color: v })}
            />
          </div>
        </div>
      </Panel>
      <Panel title={t("settings.region")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Choice
            id="c-tz"
            label={t("settings.timezone")}
            value={f.timezone}
            onChange={(v) => set({ timezone: v })}
            options={withCurrent(TIMEZONES, f.timezone).map((z) => ({
              value: z,
              label: z.replace("_", " "),
            }))}
          />
          <Choice
            id="c-currency"
            label={t("settings.currency")}
            value={f.currency}
            onChange={(v) => set({ currency: v })}
            options={withCurrent(CURRENCIES, f.currency).map((c) => ({
              value: c,
              label: c,
            }))}
          />
          <Choice
            id="c-lang"
            label={t("settings.language")}
            value={f.language}
            onChange={(v) => set({ language: v })}
            options={LANGUAGES.map((l) => ({
              value: l,
              label: t(`settings.languages.${l}`),
            }))}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("company.regionHint")}
        </p>
      </Panel>
      <Panel title={t("settings.contact")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text
            id="c-phone"
            label={t("settings.phone")}
            type="tel"
            value={f.phone}
            onChange={(v) => set({ phone: v })}
          />
          <Text
            id="c-email"
            label={t("fields.email")}
            type="email"
            value={f.email}
            onChange={(v) => set({ email: v })}
          />
          {SOCIAL.map((name) => (
            <Text
              key={name}
              id={`c-${name}`}
              label={t(`settings.social.${name}`)}
              type="url"
              placeholder="https://…"
              value={links[name] ?? ""}
              onChange={(v) => set({ social_links: { ...links, [name]: v } })}
            />
          ))}
        </div>
      </Panel>
      <Panel title={t("settings.booking")} lead={t("company.bookingLead")}>
        <div className="space-y-4">
          <ModePicker
            name="booking_mode"
            value={f.booking_mode}
            onChange={(m) => set({ booking_mode: m })}
          />
          <ActiveSwitch
            id="c-approval"
            label={t("settings.approval")}
            hint={t("settings.approvalHint")}
            checked={f.require_approval}
            onChange={(v) => set({ require_approval: v })}
          />
          <Area
            id="c-policy"
            label={t("settings.policy")}
            value={f.booking_policy}
            onChange={(v) => set({ booking_policy: v })}
            hint={t("settings.policyHint")}
          />
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

/** /company/rules — the booking rule every branch starts from (every field needed) */
export function CompanyRulesPage() {
  const { t } = useTranslation()
  const rule = useCompanyRule()
  const save = useSetCompanyRule()
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t("nav.bookingRules")} lead={t("company.rulesLead")} />
      {rule.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : rule.isError ? (
        <PageError error={rule.error} onRetry={() => rule.refetch()} />
      ) : (
        <RuleForm
          key={rule.dataUpdatedAt}
          idPrefix="company"
          own={rule.data}
          inherited={null}
          inForce={{
            data: rule.data as unknown as EffectiveRule,
            isPending: false,
            error: null,
          }}
          title={t("company.ruleTitle")}
          lead={t("company.ruleLead")}
          onSave={(fields) => save.mutateAsync(fields)}
        />
      )}
    </div>
  )
}
