import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { TextField } from "@/components/form"
import { PageError } from "@/components/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
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
import { Textarea } from "@/components/ui/textarea"
import type { ManagedSport } from "@/lib/api/types"
import { SPORT_TYPES, type SportType } from "@/lib/places"

import { manage, useChange, useSportsList, useDelete } from "../api"
import {
  ActiveSwitch,
  DeleteButton,
  EmptyState,
  FormDialog,
  ImageField,
  PageHeader,
} from "../ui"
import { useInvalidate } from "./shared"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "validation.required")
    .max(100, "validation.tooLong"),
  description: z.string().max(2000, "validation.tooLong"),
  image_key: z.string(),
  active: z.boolean(),
  // what customers filter places by; "" only until the owner picks one
  type: z
    .string()
    .refine(
      (v) => (SPORT_TYPES as readonly string[]).includes(v),
      "setup.sports.typeRequired",
    ),
})
type Values = z.infer<typeof schema>

export function SportsPage() {
  const { t } = useTranslation()
  const sports = useSportsList()
  const [editing, setEditing] = useState<ManagedSport | "new" | null>(null)

  return (
    <>
      <PageHeader
        title={t("setup.sports.title")}
        lead={t("setup.sports.lead")}
        actions={
          <Button className="h-11 lg:h-9" onClick={() => setEditing("new")}>
            <PlusIcon />
            {t("setup.sports.add")}
          </Button>
        }
      />
      {sports.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : sports.isError ? (
        <PageError error={sports.error} onRetry={() => sports.refetch()} />
      ) : sports.data.length === 0 ? (
        <EmptyState
          text={t("setup.sports.empty")}
          action={
            <Button className="h-11 lg:h-9" onClick={() => setEditing("new")}>
              {t("setup.sports.add")}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {sports.data.map((s) => (
            <SportRow key={s.id} sport={s} onEdit={() => setEditing(s)} />
          ))}
        </ul>
      )}
      {editing && (
        <SportDialog
          sport={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

function SportRow({
  sport,
  onEdit,
}: {
  sport: ManagedSport
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const invalidate = useInvalidate(["sports"])
  const [open, setOpen] = useState(false)
  const remove = useDelete(manage.deleteSport, () => {
    setOpen(false)
    invalidate()
  })
  return (
    <li className="flex items-center gap-3 rounded-xl bg-background p-3 ring-1 ring-border">
      {sport.image_url ? (
        <img
          src={sport.image_url}
          alt=""
          className="size-14 rounded-lg object-cover"
        />
      ) : (
        <span className="flex size-14 items-center justify-center rounded-lg bg-muted text-xl font-semibold">
          {sport.name.charAt(0)}
        </span>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="min-h-11 min-w-0 flex-1 text-left"
      >
        <span className="block truncate font-medium">{sport.name}</span>
        <span className="block text-sm text-muted-foreground">
          {t(`sportTypes.${sport.type}`)}
        </span>
        {!sport.active && <Badge variant="secondary">{t("dash.hidden")}</Badge>}
      </button>
      <Button variant="outline" className="h-11 lg:h-9" onClick={onEdit}>
        {t("dash.edit")}
      </Button>
      <DeleteButton
        what={sport.name}
        open={open}
        onOpenChange={setOpen}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(sport.id)}
      />
    </li>
  )
}

function SportDialog({
  sport,
  onClose,
}: {
  sport?: ManagedSport
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [imageUrl, setImageUrl] = useState(sport?.image_url ?? "")
  const save = useChange(manage.saveSport, ["sports"])
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: sport?.name ?? "",
      description: sport?.description ?? "",
      image_key: sport?.image_key ?? "",
      active: sport?.active ?? true,
      type: sport?.type ?? "",
    },
  })

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={sport ? t("setup.sports.edit") : t("setup.sports.add")}
      submitLabel={t("dash.save")}
      pending={save.isPending}
      error={save.error}
      onSubmit={form.handleSubmit((v) =>
        save.mutate(
          { id: sport?.id, ...v, type: v.type as SportType },
          { onSuccess: onClose },
        ),
      )}
    >
      <FieldGroup>
        <TextField
          label={t("setup.name")}
          registration={form.register("name")}
          error={form.formState.errors.name}
        />
        <Controller
          control={form.control}
          name="type"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error || undefined}>
              <FieldLabel htmlFor="sport-type">
                {t("setup.sports.type")}
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="sport-type"
                  aria-invalid={!!fieldState.error || undefined}
                  className="h-11 w-full lg:h-9"
                >
                  <SelectValue placeholder={t("setup.sports.typeChoose")} />
                </SelectTrigger>
                <SelectContent>
                  {SPORT_TYPES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {t(`sportTypes.${st}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{t("setup.sports.typeHint")}</FieldDescription>
              {fieldState.error?.message && (
                <FieldError>{t(fieldState.error.message)}</FieldError>
              )}
            </Field>
          )}
        />
        <Field>
          <FieldLabel htmlFor="description">
            {t("setup.descriptionOptional")}
          </FieldLabel>
          <Textarea
            id="description"
            rows={3}
            {...form.register("description")}
          />
        </Field>
        <ImageField
          label={t("setup.photo")}
          folder="sports"
          url={imageUrl}
          onChange={(key, url) => {
            form.setValue("image_key", key)
            setImageUrl(url)
          }}
        />
        <Controller
          control={form.control}
          name="active"
          render={({ field }) => (
            <ActiveSwitch
              id="sport-active"
              label={t("setup.shownOnPage")}
              hint={t("setup.shownOnPageHint")}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FieldGroup>
    </FormDialog>
  )
}
