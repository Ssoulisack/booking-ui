import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { z } from "zod"

import { TextField } from "@/components/form"
import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { ManagedResource, ResourceKind } from "@/lib/api/types"

import {
  manage,
  useChange,
  useResourcesList,
  useSettings,
  useSportsList,
  useDelete,
} from "../api"
import { useDashboard } from "../context"
import {
  ActiveSwitch,
  DeleteButton,
  EmptyState,
  FormDialog,
  PageHeader,
} from "../ui"
import { HoursEditor } from "./HoursEditor"
import { PriceEditor } from "./PriceEditor"
import { ReadyBadges } from "./ReadyBadges"
import { RuleEditor } from "./RuleEditor"
import { useInvalidate } from "./shared"

const KINDS: ResourceKind[] = [
  "court",
  "pitch",
  "ring",
  "lane",
  "bay",
  "table",
  "room",
  "other",
]

const schema = z.object({
  sport_id: z
    .number({ message: "validation.required" })
    .int()
    .positive("validation.required"),
  name: z
    .string()
    .trim()
    .min(1, "validation.required")
    .max(100, "validation.tooLong"),
  kind: z.enum(KINDS),
  active: z.boolean(),
})
type Values = z.infer<typeof schema>

/** /setup/spaces — the bookable spaces (courts, pitches, rings, lanes…), grouped by sport */
export function CourtsPage() {
  const { t } = useTranslation()
  const sports = useSportsList()
  const courts = useResourcesList()
  const [editing, setEditing] = useState<ManagedResource | "new" | null>(null)
  const noSports = sports.data?.length === 0

  const add = (
    <Button
      className="h-11 lg:h-9"
      disabled={noSports}
      onClick={() => setEditing("new")}
    >
      <PlusIcon />
      {t("setup.courts.add")}
    </Button>
  )

  return (
    <>
      <PageHeader
        title={t("setup.courts.title")}
        lead={t("setup.courts.lead")}
        actions={add}
      />
      {sports.isPending || courts.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : sports.isError || courts.isError ? (
        <PageError error={sports.error ?? courts.error} />
      ) : noSports ? (
        <EmptyState
          text={t("setup.courts.needSport")}
          action={
            <Button asChild className="h-11 lg:h-9">
              <Link to="../sports">{t("setup.sports.add")}</Link>
            </Button>
          }
        />
      ) : courts.data.length === 0 ? (
        <EmptyState text={t("setup.courts.empty")} action={add} />
      ) : (
        <div className="space-y-6">
          {sports.data
            .filter((s) => courts.data.some((c) => c.sport_id === s.id))
            .map((sport) => (
              <section key={sport.id} className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {sport.name}
                </h2>
                <ul className="divide-y rounded-xl bg-background ring-1 ring-border">
                  {courts.data
                    .filter((c) => c.sport_id === sport.id)
                    .map((c) => (
                      <CourtRow
                        key={c.id}
                        court={c}
                        onEdit={() => setEditing(c)}
                      />
                    ))}
                </ul>
              </section>
            ))}
        </div>
      )}
      {editing && (
        <CourtDialog
          court={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

function CourtRow({
  court,
  onEdit,
}: {
  court: ManagedResource
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const invalidate = useInvalidate(["resources"])
  const [open, setOpen] = useState(false)
  const remove = useDelete(manage.deleteResource, () => {
    setOpen(false)
    invalidate()
  })
  return (
    <li className="flex flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap">
      <Link
        to={String(court.id)}
        className="flex min-h-12 min-w-0 flex-1 flex-col justify-center gap-1 rounded-md px-1"
      >
        <span className="flex items-center gap-2 font-medium">
          {court.name}
          <span className="text-sm font-normal text-muted-foreground">
            {t(`setup.kinds.${court.kind}`)}
          </span>
        </span>
        <ReadyBadges owner="resource" id={court.id} active={court.active} />
      </Link>
      <Button variant="outline" className="h-11 lg:h-9" onClick={onEdit}>
        {t("dash.edit")}
      </Button>
      <DeleteButton
        what={court.name}
        open={open}
        onOpenChange={setOpen}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(court.id)}
      />
      <Link
        to={String(court.id)}
        aria-label={t("setup.courts.hoursAndPrice", { name: court.name })}
        className="hidden size-9 items-center justify-center text-muted-foreground sm:flex"
      >
        <ChevronRightIcon className="size-4" />
      </Link>
    </li>
  )
}

function CourtDialog({
  court,
  onClose,
}: {
  court?: ManagedResource
  onClose: () => void
}) {
  const { t } = useTranslation()
  const sports = useSportsList().data ?? []
  const save = useChange(manage.saveResource, ["resources"])
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      sport_id: court?.sport_id ?? sports[0]?.id,
      name: court?.name ?? "",
      kind: court?.kind ?? "court",
      active: court?.active ?? true,
    },
  })

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={court ? t("setup.courts.edit") : t("setup.courts.add")}
      description={court ? undefined : t("setup.courts.afterAdd")}
      submitLabel={t("dash.save")}
      pending={save.isPending}
      error={save.error}
      onSubmit={form.handleSubmit((v) =>
        save.mutate({ id: court?.id, ...v }, { onSuccess: onClose }),
      )}
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="sport_id"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error || undefined}>
              <FieldLabel htmlFor="court-sport">{t("setup.sport")}</FieldLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <SelectTrigger id="court-sport" className="h-11 w-full lg:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sports.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.error?.message && (
                <FieldError>{t(fieldState.error.message)}</FieldError>
              )}
            </Field>
          )}
        />
        <TextField
          label={t("setup.name")}
          placeholder={t("setup.courts.namePlaceholder")}
          registration={form.register("name")}
          error={form.formState.errors.name}
        />
        <Controller
          control={form.control}
          name="kind"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="court-kind">
                {t("setup.courts.kind")}
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="court-kind" className="h-11 w-full lg:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(`setup.kinds.${k}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="active"
          render={({ field }) => (
            <ActiveSwitch
              id="court-active"
              label={t("setup.bookable")}
              hint={t("setup.bookableHint")}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FieldGroup>
    </FormDialog>
  )
}

/** /setup/spaces/:resourceId — opening hours, price and the space's own booking rule */
export function CourtDetailPage() {
  const { t } = useTranslation()
  const { resourceId } = useParams()
  const id = Number(resourceId)
  const courts = useResourcesList()
  const sports = useSportsList()
  const settings = useSettings()
  const role = useDashboard().branch.role
  const court = courts.data?.find((c) => c.id === id)
  const sport = sports.data?.find((s) => s.id === court?.sport_id)

  if (courts.isPending || settings.isPending)
    return <Skeleton className="h-96 rounded-xl" />
  if (!court || !settings.data)
    return <PageError error={courts.error ?? settings.error} />

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" className="-ml-3 h-11 lg:h-9">
          <Link to="..">
            <ArrowLeftIcon />
            {t("setup.tabs.spaces")}
          </Link>
        </Button>
        <PageHeader
          title={court.name}
          lead={[sport?.name, t(`setup.kinds.${court.kind}`)]
            .filter(Boolean)
            .join(" · ")}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <HoursEditor owner="resource" id={court.id} />
        <div className="space-y-6">
          <PriceEditor
            owner="resource"
            id={court.id}
            currency={settings.data.in_force.currency}
            rule={{ sport_id: court.sport_id, resource_id: court.id }}
          />
          {role !== "staff" && (
            <RuleEditor
              scope="resource"
              scopeId={court.id}
              parent={{ sport_id: court.sport_id }}
              self={{ resource_id: court.id }}
              title={t("rules.courtTitle")}
              lead={t("rules.courtLead", { sport: sport?.name ?? "" })}
            />
          )}
        </div>
      </div>
    </div>
  )
}
