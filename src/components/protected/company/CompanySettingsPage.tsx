import { useState } from "react"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { PageError } from "@/components/global/page-state"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ActiveSwitch,
  ImageField,
  PageHeader,
  Panel,
} from "@/components/protected/branch/ui"
import { RuleForm } from "@/components/protected/setup/RuleEditor"
import { DEFAULT_BRAND } from "@/components/public/booking/brand"
import {
  Area,
  BrandColor,
  Choice,
  ModePicker,
  Text,
} from "@/components/protected/settings/fields"
import {
  CURRENCIES,
  filledLinks,
  LANGUAGES,
  SOCIAL,
  TIMEZONES,
  withCurrent,
} from "@/components/protected/settings/options"
import {
  FontField,
  RingColorsField,
} from "@/components/protected/settings/look-fields"
import { LookPreview } from "@/components/protected/settings/LookPreview"
import type { Company, CompanyInput } from "@/types/company"
import type { EffectiveRule } from "@/types/public"

import { useUnsaved } from "@/stores/unsaved"

import {
  useCompany,
  useCompanyRule,
  useSetCompanyRule,
  useUpdateCompany,
} from "@/hooks/use-company"

/** /company/settings — the brand and the settings every branch starts from */
export function CompanySettingsPage() {
  const company = useCompany()
  if (company.isPending) return <Skeleton className="h-96 rounded-xl" />
  if (company.isError)
    return <PageError error={company.error} onRetry={() => company.refetch()} />
  return <CompanyForm key={company.dataUpdatedAt} company={company.data} />
}

/** Says who a settings block reaches: every branch, every branch unless it overrides, or the brand home only */
function ScopeTag({ kind }: { kind: "all" | "default" | "home" }) {
  const { t } = useTranslation()
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {t(`company.scope.${kind}`)}
    </span>
  )
}

const TABS = ["brand", "look", "region", "booking", "contact"] as const
type Tab = (typeof TABS)[number]

/** the label of each tab (the same words as the panel's title) */
const TAB_LABEL: Record<Tab, string> = {
  brand: "company.brand",
  look: "look.appearance",
  region: "settings.region",
  booking: "settings.booking",
  contact: "settings.contact",
}

/** the fields each tab edits: a tab "has changes" when any of them differs from what was loaded */
const TAB_FIELDS: Record<Tab, Array<keyof CompanyInput>> = {
  brand: ["name", "description", "logo_key", "cover_key", "brand_color"],
  look: ["ring_colors", "heading_font", "body_font"],
  region: ["timezone", "currency", "language"],
  booking: ["booking_mode", "require_approval", "booking_policy"],
  contact: ["phone", "email", "social_links"],
}

const isTab = (v: string | null): v is Tab => TABS.some((t) => t === v)

/** a value as text, so two of them can be compared (empty social links do not count as a change) */
const shown = (f: CompanyInput, key: keyof CompanyInput) =>
  JSON.stringify(
    key === "social_links" ? filledLinks(f.social_links ?? {}) : f[key],
  )

function CompanyForm({ company }: { company: Company }) {
  const { t } = useTranslation()
  const [f, setF] = useState<CompanyInput>(() => ({
    name: company.name,
    logo_key: company.logo_key,
    cover_key: company.cover_key,
    brand_color: company.brand_color || DEFAULT_BRAND,
    ring_colors: company.ring_colors ?? [],
    heading_font: company.heading_font ?? "",
    body_font: company.body_font ?? "",
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
  // what was loaded: a tab has changes when its fields differ from this
  const [base] = useState(f)
  const tabChanged = (k: Tab) =>
    TAB_FIELDS[k].some((key) => shown(f, key) !== shown(base, key))
  const dirty = TABS.some(tabChanged)
  useUnsaved(dirty) // leaving the page asks first (see UnsavedGuard)
  const save = useUpdateCompany()
  const links = f.social_links ?? {}
  // a picture is saved the moment it is chosen or removed (with the rest of the form), so it is still there after a reload
  const savePicture = (patch: Partial<CompanyInput>) => {
    const next = { ...f, ...patch }
    setF(next)
    save.mutate(
      { ...next, social_links: filledLinks(next.social_links ?? {}) },
      { onSuccess: () => toast.success(t("settings.saved")) },
    )
  }

  // the open tab lives in the address (?tab=look): it is still there after a save reloads the form, and can be linked to
  const [params, setParams] = useSearchParams()
  const tabParam = params.get("tab")
  const tab: Tab = isTab(tabParam) ? tabParam : "brand"
  const go = (next: Tab) => setParams({ tab: next }, { replace: true })
  // the tab the person asked for while this one has changes: waits for their answer in the dialog
  const [target, setTarget] = useState<Tab | null>(null)
  const requestTab = (next: Tab) => {
    if (next === tab) return
    if (tabChanged(tab)) setTarget(next)
    else go(next)
  }
  // leaving throws away what was typed on this tab (the popup said so), then opens the other tab
  const leave = () => {
    const next = target
    if (!next) return
    const back = Object.fromEntries(
      TAB_FIELDS[tab].map((key) => [key, base[key]]),
    )
    setF((cur) => ({ ...cur, ...back }))
    setTarget(null)
    go(next)
  }

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
      <Tabs value={tab} onValueChange={(v) => requestTab(v as Tab)}>
        {/* the tabs on the left, Save on the right: always in sight, no scrolling down to the end of a long tab */}
        <div className="flex items-center justify-between gap-3">
          {/* five tabs can be wider than a phone: this part scrolls sideways (min-w-0 lets it shrink). The padding keeps the focus ring of a tab from being cut by the scroll box */}
          <div className="-mx-1 min-w-0 flex-1 overflow-x-auto p-1">
            {/* the list is h-8 by default (a rule that only a same-named rule can replace): h-11 is taller than the h-9 tabs plus its padding, so no tab sticks out */}
            <TabsList className="w-max group-data-horizontal/tabs:h-11">
              {TABS.map((k) => (
                <TabsTrigger
                  key={k}
                  value={k}
                  // the open tab: candy yellow with black text (also while the mouse is over it); the others turn yellow, not white, on hover in dark mode
                  className="h-9 px-3 dark:hover:text-[#FBBF24] data-active:bg-[#FBBF24] data-active:text-black data-active:shadow-none data-active:hover:text-black dark:data-active:border-transparent dark:data-active:bg-[#FBBF24] dark:data-active:text-black dark:data-active:hover:text-black"
                >
                  {t(TAB_LABEL[k])}
                  {tabChanged(k) && (
                    <>
                      {/* the same colour as the text, so it shows on the yellow tab too */}
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-current"
                      />
                      <span className="sr-only">{t("unsaved.title")}</span>
                    </>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {/* phone: a bar pinned to the bottom of the screen, Discard 30% and Save 70% of the row, minus half the 8px gap each (the error above them); from sm up both sit at the end of the tab row */}
          <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t bg-background p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:static sm:z-auto sm:shrink-0 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="sm:hidden">
              <ErrorAlert error={save.error} />
            </div>
            <div className="flex gap-2">
              {/* back to what was loaded; disabled (not hidden) while nothing is changed, so the two widths never jump */}
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-none basis-[calc(30%-4px)] sm:basis-auto lg:h-9"
                disabled={!dirty || save.isPending}
                onClick={() => {
                  setF(base)
                  save.reset()
                }}
              >
                {t("settings.discard")}
              </Button>
              <Button
                type="submit"
                className="h-11 flex-none basis-[calc(70%-4px)] sm:basis-auto lg:h-9"
                disabled={save.isPending || !dirty}
              >
                {save.isPending && <Spinner />}
                {t("settings.save")}
              </Button>
            </div>
          </div>
        </div>
        {/* from sm up a failed save is shown here, under the button, not at the bottom of a long tab */}
        <div className="hidden sm:block">
          <ErrorAlert error={save.error} />
        </div>
        <TabsContent value="brand" className="mt-4">
          <Panel
            title={t("company.brand")}
            lead={t("settings.brandingLead")}
            actions={<ScopeTag kind="all" />}
          >
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
                base={API_ENDPOINTS.COMPANY.BASE}
                url={company.logo_url}
                onChange={(key) => savePicture({ logo_key: key })}
              />
              <ImageField
                label={t("settings.cover")}
                folder="branding"
                base={API_ENDPOINTS.COMPANY.BASE}
                url={company.cover_url}
                wide
                onChange={(key) => savePicture({ cover_key: key })}
              />
              <div className="md:col-span-2">
                <BrandColor
                  value={f.brand_color}
                  onChange={(v) => set({ brand_color: v })}
                />
              </div>
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="look" className="mt-4">
          <Panel
            title={t("look.appearance")}
            lead={t("look.appearanceLead")}
            actions={<ScopeTag kind="default" />}
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
              <div className="space-y-5">
                <RingColorsField
                  value={f.ring_colors}
                  onChange={(v) => set({ ring_colors: v })}
                  brand={f.brand_color}
                />
                <FontField
                  id="c-heading-font"
                  kind="heading"
                  label={t("look.headingFont")}
                  value={f.heading_font}
                  onChange={(v) => set({ heading_font: v })}
                />
                <FontField
                  id="c-body-font"
                  kind="body"
                  label={t("look.bodyFont")}
                  value={f.body_font}
                  onChange={(v) => set({ body_font: v })}
                />
              </div>
              {/* follows the choices as they are made; above the controls on a phone */}
              <div className="order-first space-y-2 lg:sticky lg:top-20 lg:order-none lg:self-start">
                <LookPreview name={f.name} brand={f.brand_color} look={f} />
                <p className="text-sm text-muted-foreground">
                  {t("look.previewNote")}
                </p>
              </div>
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="region" className="mt-4">
          <Panel
            title={t("settings.region")}
            lead={t("company.regionHint")}
            actions={<ScopeTag kind="all" />}
          >
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
        </TabsContent>
        <TabsContent value="booking" className="mt-4">
          <Panel
            title={t("settings.booking")}
            lead={t("company.bookingLead")}
            actions={<ScopeTag kind="default" />}
          >
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
        </TabsContent>
        <TabsContent value="contact" className="mt-4">
          <Panel
            title={t("settings.contact")}
            lead={t("company.contactLead")}
            actions={<ScopeTag kind="home" />}
          >
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
                  onChange={(v) =>
                    set({ social_links: { ...links, [name]: v } })
                  }
                />
              ))}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
      {/* phone: room for the pinned Save bar, so it never covers the last field */}
      <div
        aria-hidden
        className={`sm:hidden ${save.error ? "h-44" : "h-24"}`}
      />
      {/* a tab with changes is being left for another: leave (the changes are lost) or keep editing */}
      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsaved.tabTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("unsaved.tabLead")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* side by side on every screen: leave on the left, keep editing on the right (the same as the page-leave popup) */}
          <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              className="h-11 lg:h-9"
              onClick={leave}
            >
              {t("unsaved.tabLeave")}
            </Button>
            <AlertDialogCancel className="h-11 lg:h-9">
              {t("unsaved.tabKeep")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
