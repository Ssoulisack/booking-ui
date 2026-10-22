import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { EffectiveRule, RuleFields, RuleScope } from "@/lib/api/types"
import { duration } from "@/lib/format"

import {
  manage,
  useBiz,
  useCompanyRuleAtBranch,
  useEffectiveRule,
  useRules,
} from "../api"
import { Panel } from "../ui"
import { numberOrNull, useInvalidate } from "./shared"

const FIELDS: Array<{
  key: keyof RuleFields
  unit: "min" | "h" | "days" | ""
}> = [
  { key: "min_duration_min", unit: "min" },
  { key: "max_duration_min", unit: "min" },
  { key: "duration_step_min", unit: "min" },
  { key: "start_step_min", unit: "min" },
  { key: "cancel_before_hours", unit: "h" },
  { key: "max_days_ahead", unit: "days" },
  { key: "min_notice_min", unit: "min" },
  { key: "capacity", unit: "" },
  { key: "max_active_bookings_per_customer", unit: "" },
]

/** The rule in force, in one line people can read */
export function RuleSummary({ rule }: { rule: EffectiveRule }) {
  const { t } = useTranslation()
  const lengths =
    rule.min_duration_min === rule.max_duration_min
      ? duration(rule.min_duration_min)
      : t("rules.summary.lengths", {
          min: duration(rule.min_duration_min),
          max: duration(rule.max_duration_min),
          step: duration(rule.duration_step_min),
        })
  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      {[
        lengths,
        t("rules.summary.starts", { step: duration(rule.start_step_min) }),
        rule.cancel_before_hours === 0
          ? t("rules.summary.cancelUntilStart")
          : t("rules.summary.cancel", { count: rule.cancel_before_hours }),
        t("rules.summary.ahead", { count: rule.max_days_ahead }),
        t("rules.summary.notice", { notice: duration(rule.min_notice_min) }),
        t("rules.summary.perCustomer", {
          count: rule.max_active_bookings_per_customer,
        }),
      ].map((text) => (
        <li key={text} className="rounded-full bg-muted px-3 py-1">
          {text}
        </li>
      ))}
    </ul>
  )
}

/**
 * The rule of one scope at a branch: its changes to the company rule ("branch"), a sport or a
 * court. An empty field uses the wider rule, whose value shows in grey.
 */
export function RuleEditor({
  scope,
  scopeId,
  parent,
  self,
  title,
  lead,
}: {
  scope: Exclude<RuleScope, "company">
  scopeId: number
  // effective-rule query of the wider scope (what an empty field means); none = the company rule
  parent?: { sport_id?: number; resource_id?: number }
  self: { sport_id?: number; resource_id?: number }
  title: string
  lead?: string
}) {
  const { base } = useBiz()
  const rules = useRules()
  const company = useCompanyRuleAtBranch()
  const widerRule = useEffectiveRule(parent ?? {})
  const inherited = parent ? widerRule : company
  const inForce = useEffectiveRule(self)
  const invalidate = useInvalidate(["rules"])
  if (rules.isPending || inherited.isPending) {
    return <Skeleton className="h-64 rounded-xl" />
  }
  if (rules.isError) return <ErrorAlert error={rules.error} />
  const own = rules.data.find(
    (r) => r.scope_type === scope && r.scope_id === scopeId,
  )
  return (
    <RuleForm
      key={JSON.stringify(own ?? null)}
      idPrefix={`${scope}-${scopeId}`}
      own={own ?? null}
      inherited={(inherited.data as EffectiveRule | undefined) ?? null}
      inForce={inForce}
      title={title}
      lead={lead}
      onSave={async (fields) => {
        await manage.saveRule(base, { scope, id: scopeId, fields })
        invalidate()
      }}
      onReset={
        own
          ? async () => {
              await manage.deleteRule(base, { scope, id: scopeId })
              invalidate()
            }
          : undefined
      }
    />
  )
}

/**
 * The rule fields with save (and "use the wider rule again"). With `inherited`, empty fields
 * show the wider value in grey; without, every field is needed (the company rule).
 */
export function RuleForm({
  idPrefix,
  own,
  inherited,
  inForce,
  title,
  lead,
  onSave,
  onReset,
}: {
  idPrefix: string
  own: RuleFields | null
  inherited: EffectiveRule | null
  inForce: { data?: EffectiveRule; isPending: boolean; error: unknown }
  title: string
  lead?: string
  onSave: (fields: RuleFields) => Promise<unknown>
  onReset?: () => Promise<unknown>
}) {
  const { t } = useTranslation()
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      FIELDS.map(({ key }) => [
        key,
        own?.[key] == null ? "" : String(own[key]),
      ]),
    ),
  )
  const save = useMutation({
    mutationFn: onSave,
    onSuccess: () => toast.success(t("rules.saved")),
  })
  const reset = useMutation({
    mutationFn: () => onReset?.() ?? Promise.resolve(),
    onSuccess: () => toast.success(t("rules.resetDone")),
  })

  const fields = Object.fromEntries(
    FIELDS.map(({ key }) => [key, numberOrNull(values[key])]),
  ) as unknown as RuleFields

  return (
    <Panel title={title} lead={lead}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate(fields)
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map(({ key, unit }) => {
            const id = `${idPrefix}-${key}`
            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={id}>{t(`rules.fields.${key}`)}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={id}
                    inputMode="numeric"
                    value={values[key]}
                    placeholder={inherited ? String(inherited[key]) : ""}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [key]: e.target.value.replace(/[^\d]/g, ""),
                      })
                    }
                    className="h-11 w-28 text-base lg:h-9 lg:text-sm"
                  />
                  {unit && (
                    <span className="text-sm text-muted-foreground">
                      {t(`rules.units.${unit}`)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {inherited && (
          <p className="text-sm text-muted-foreground">
            {t("rules.emptyInherits")}
          </p>
        )}

        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium">{t("rules.inForce")}</p>
          {inForce.isPending ? (
            <Skeleton className="h-7 w-2/3" />
          ) : inForce.error ? (
            <ErrorAlert error={inForce.error} />
          ) : inForce.data ? (
            <RuleSummary rule={inForce.data} />
          ) : null}
        </div>

        <ErrorAlert error={save.error ?? reset.error} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            className="h-11 lg:h-9"
            disabled={save.isPending}
          >
            {save.isPending && <Spinner />}
            {t("rules.save")}
          </Button>
          {onReset && (
            <Button
              type="button"
              variant="outline"
              className="h-11 lg:h-9"
              disabled={reset.isPending}
              onClick={() => reset.mutate()}
            >
              {t("rules.reset")}
            </Button>
          )}
        </div>
      </form>
    </Panel>
  )
}
