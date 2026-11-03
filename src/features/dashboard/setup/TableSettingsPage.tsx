import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { TableMode, TableSettings } from "@/lib/api/types"
import { useUnsaved } from "@/stores/unsaved"

import { manage, useChange, useTableSettings } from "../api"
import { ActiveSwitch, PageHeader, Panel } from "../ui"

const MODES: TableMode[] = ["one_at_a_time", "hold"]

/** /setup/table-settings — how the restaurant takes table bookings */
export function TableSettingsPage() {
  const settings = useTableSettings()
  if (settings.isPending) return <Skeleton className="h-96 rounded-xl" />
  if (settings.isError)
    return (
      <PageError error={settings.error} onRetry={() => settings.refetch()} />
    )
  return <Form key={settings.dataUpdatedAt} initial={settings.data} />
}

function Form({ initial }: { initial: TableSettings }) {
  const { t } = useTranslation()
  const [f, setF] = useState(initial)
  const set = (patch: Partial<TableSettings>) => setF({ ...f, ...patch })
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  useUnsaved(dirty)
  const save = useChange(manage.saveTableSettings, ["table-settings"])

  return (
    <form
      noValidate
      className="mx-auto max-w-3xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate(f, {
          onSuccess: () => toast.success(t("restaurant.settings.saved")),
        })
      }}
    >
      <PageHeader
        title={t("restaurant.settings.title")}
        lead={t("restaurant.settings.lead")}
      />

      <Panel title={t("restaurant.settings.modeTitle")}>
        <fieldset className="space-y-2">
          <legend className="sr-only">
            {t("restaurant.settings.modeTitle")}
          </legend>
          {MODES.map((mode) => (
            <label
              key={mode}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary"
            >
              <input
                type="radio"
                name="table_mode"
                value={mode}
                checked={f.table_mode === mode}
                onChange={() => set({ table_mode: mode })}
                className="mt-1 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">
                  {t(`restaurant.settings.modes.${mode}`)}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {t(`restaurant.settings.modeHints.${mode}`)}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        {f.table_mode === "hold" && (
          <Minutes
            id="ts-hold"
            className="mt-4"
            label={t("restaurant.settings.hold")}
            hint={t("restaurant.settings.holdHint")}
            value={f.hold_minutes}
            onChange={(v) => set({ hold_minutes: v })}
            step={15}
          />
        )}
      </Panel>

      <Panel title={t("restaurant.settings.timesTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Minutes
            id="ts-late"
            label={t("restaurant.settings.late")}
            hint={t("restaurant.settings.lateHint", { n: f.late_minutes })}
            value={f.late_minutes}
            onChange={(v) => set({ late_minutes: v })}
            step={5}
          />
          <Minutes
            id="ts-last"
            label={t("restaurant.settings.lastCall")}
            hint={t("restaurant.settings.lastCallHint")}
            value={f.last_call_minutes}
            onChange={(v) => set({ last_call_minutes: v })}
            step={15}
          />
        </div>
      </Panel>

      <Panel title={t("restaurant.settings.groupsTitle")}>
        <div className="grid gap-4">
          <Minutes
            id="ts-max"
            label={t("restaurant.settings.maxGuests")}
            hint={t("restaurant.settings.maxGuestsHint")}
            value={f.max_guests_online}
            onChange={(v) => set({ max_guests_online: v })}
            unit={t("restaurant.guests")}
          />
          <ActiveSwitch
            id="ts-approval"
            label={t("restaurant.settings.approval")}
            hint={t("restaurant.settings.approvalHint")}
            checked={f.approval_above_guests !== null}
            onChange={(on) =>
              set({
                approval_above_guests: on
                  ? Math.min(10, Math.max(1, f.max_guests_online - 1))
                  : null,
              })
            }
          />
          {f.approval_above_guests !== null && (
            <Minutes
              id="ts-approval-n"
              label={t("restaurant.settings.approvalAbove")}
              value={f.approval_above_guests}
              onChange={(v) => set({ approval_above_guests: v })}
              unit={t("restaurant.guests")}
            />
          )}
        </div>
      </Panel>

      <Panel title={t("restaurant.settings.walkinTitle")}>
        <ActiveSwitch
          id="ts-walkin"
          label={t("restaurant.settings.walkin")}
          hint={t("restaurant.settings.walkinHint")}
          checked={f.walkin_before_booking}
          onChange={(v) => set({ walkin_before_booking: v })}
        />
      </Panel>

      <div className="space-y-3">
        <ErrorAlert error={save.error} />
        <Button
          type="submit"
          className="h-11 lg:h-9"
          disabled={save.isPending || !dirty}
        >
          {save.isPending && <Spinner />}
          {t("restaurant.settings.save")}
        </Button>
      </div>
    </form>
  )
}

/** A whole number with its unit (minutes unless told otherwise) */
function Minutes({
  id,
  label,
  hint,
  value,
  onChange,
  step = 1,
  unit,
  className,
}: {
  id: string
  label: string
  hint?: string
  value: number
  onChange: (v: number) => void
  step?: number
  unit?: string
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className="h-11 w-28 text-base lg:h-9 lg:text-sm"
        />
        <span className="text-sm text-muted-foreground">
          {unit ?? t("restaurant.minutes")}
        </span>
      </div>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}
