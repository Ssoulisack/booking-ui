import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { z } from "zod"

import { ErrorAlert, TextField } from "@/components/form"
import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { ManagedCoach } from "@/lib/api/types"

import {
  manage,
  useChange,
  useCoachesList,
  useSettings,
  useSportsList,
  useDelete,
} from "../api"
import {
  ActiveSwitch,
  DeleteButton,
  EmptyState,
  FormDialog,
  ImageField,
  PageHeader,
  Panel,
} from "../ui"
import { useUnsaved } from "@/stores/unsaved"
import { HoursEditor } from "./HoursEditor"
import { PriceEditor } from "./PriceEditor"
import { ReadyBadges } from "./ReadyBadges"
import { useInvalidate } from "./shared"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "validation.required")
    .max(100, "validation.tooLong"),
  bio: z.string().max(2000, "validation.tooLong"),
  phone: z.string().trim().max(30, "validation.tooLong"),
  image_key: z.string(),
  sport_ids: z.array(z.number()).min(1, "setup.coaches.pickSport"),
  active: z.boolean(),
})
type Values = z.infer<typeof schema>

/** /setup/coaches — coaches, the sports they teach, their hours and price */
export function CoachesPage() {
  const { t } = useTranslation()
  const coaches = useCoachesList()
  const sports = useSportsList()
  const [adding, setAdding] = useState(false)
  const add = (
    <Button
      className="h-11 lg:h-9"
      disabled={sports.data?.length === 0}
      onClick={() => setAdding(true)}
    >
      <PlusIcon />
      {t("setup.coaches.add")}
    </Button>
  )

  return (
    <>
      <PageHeader
        title={t("setup.coaches.title")}
        lead={t("setup.coaches.lead")}
        actions={add}
      />
      {coaches.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : coaches.isError ? (
        <PageError error={coaches.error} onRetry={() => coaches.refetch()} />
      ) : coaches.data.length === 0 ? (
        <EmptyState text={t("setup.coaches.empty")} action={add} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {coaches.data.map((c) => (
            <CoachRow key={c.id} coach={c} />
          ))}
        </ul>
      )}
      {adding && <CoachDialog onClose={() => setAdding(false)} />}
    </>
  )
}

function CoachRow({ coach }: { coach: ManagedCoach }) {
  const { t } = useTranslation()
  const invalidate = useInvalidate(["coaches"])
  const [open, setOpen] = useState(false)
  const remove = useDelete(manage.deleteCoach, () => {
    setOpen(false)
    invalidate()
  })
  return (
    <li className="flex items-center gap-3 rounded-xl bg-background p-3 ring-1 ring-border">
      {coach.image_url ? (
        <img
          src={coach.image_url}
          alt=""
          className="size-14 rounded-full object-cover"
        />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold">
          {coach.name.charAt(0)}
        </span>
      )}
      <Link
        to={String(coach.id)}
        className="flex min-h-12 min-w-0 flex-1 flex-col justify-center gap-1"
      >
        <span className="truncate font-medium">{coach.name}</span>
        <span className="truncate text-sm text-muted-foreground">
          {coach.sports.map((s) => s.name).join(", ")}
        </span>
        <ReadyBadges owner="coach" id={coach.id} active={coach.active} />
      </Link>
      <Button asChild variant="outline" className="h-11 lg:h-9">
        <Link to={String(coach.id)}>{t("dash.edit")}</Link>
      </Button>
      <DeleteButton
        what={coach.name}
        open={open}
        onOpenChange={setOpen}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(coach.id)}
      />
    </li>
  )
}

/** Add a coach: a dialog. Changing one later happens on the coach's own page (CoachDetails). */
function CoachDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const save = useChange(manage.saveCoach, ["coaches"])
  const form = useCoachForm()
  const [imageUrl, setImageUrl] = useState("")

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("setup.coaches.add")}
      description={t("setup.coaches.afterAdd")}
      submitLabel={t("dash.save")}
      pending={save.isPending}
      error={save.error}
      onSubmit={form.handleSubmit((v) =>
        save.mutate(v, { onSuccess: onClose }),
      )}
    >
      <CoachFields form={form} imageUrl={imageUrl} setImageUrl={setImageUrl} />
    </FormDialog>
  )
}

function useCoachForm(coach?: ManagedCoach) {
  const sports = useSportsList().data ?? []
  return useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: coach?.name ?? "",
      bio: coach?.bio ?? "",
      phone: coach?.phone ?? "",
      image_key: coach?.image_key ?? "",
      sport_ids:
        coach?.sports.map((s) => s.id) ??
        (sports.length === 1 ? [sports[0].id] : []),
      active: coach?.active ?? true,
    },
  })
}

/** The details of a coach (name, sports, phone, bio, photo, bookable): on the coach's page, saved with one button */
function CoachDetails({ coach }: { coach: ManagedCoach }) {
  const { t } = useTranslation()
  const save = useChange(manage.saveCoach, ["coaches"])
  const form = useCoachForm(coach)
  useUnsaved(form.formState.isDirty)
  const [imageUrl, setImageUrl] = useState(coach.image_url ?? "")

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((v) =>
        save.mutate(
          { id: coach.id, ...v },
          {
            onSuccess: () => {
              form.reset(v)
              toast.success(t("settings.saved"))
            },
          },
        ),
      )}
    >
      <Panel title={t("setup.coaches.details")}>
        <div className="space-y-5">
          <ErrorAlert error={save.error} />
          <CoachFields
            form={form}
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
          />
          <Button
            type="submit"
            className="h-11 lg:h-9"
            disabled={save.isPending || !form.formState.isDirty}
          >
            {save.isPending && <Spinner />}
            {t("dash.save")}
          </Button>
        </div>
      </Panel>
    </form>
  )
}

function CoachFields({
  form,
  imageUrl,
  setImageUrl,
}: {
  form: UseFormReturn<Values>
  imageUrl: string
  setImageUrl: (url: string) => void
}) {
  const { t } = useTranslation()
  const sports = useSportsList().data ?? []
  return (
    <FieldGroup>
      <TextField
        label={t("setup.name")}
        registration={form.register("name")}
        error={form.formState.errors.name}
      />
      <Controller
        control={form.control}
        name="sport_ids"
        render={({ field, fieldState }) => (
          <FieldSet data-invalid={!!fieldState.error || undefined}>
            <FieldLegend variant="label">
              {t("setup.coaches.teaches")}
            </FieldLegend>
            <div className="grid gap-1 sm:grid-cols-2">
              {sports.map((s) => {
                const checked = field.value.includes(s.id)
                return (
                  <Label
                    key={s.id}
                    className="flex min-h-11 items-center gap-3 rounded-lg border px-3 font-normal"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(on) =>
                        field.onChange(
                          on
                            ? [...field.value, s.id]
                            : field.value.filter((x) => x !== s.id),
                        )
                      }
                    />
                    {s.name}
                  </Label>
                )
              })}
            </div>
            {fieldState.error?.message && (
              <FieldError>{t(fieldState.error.message)}</FieldError>
            )}
          </FieldSet>
        )}
      />
      <TextField
        label={t("setup.coaches.phone")}
        type="tel"
        inputMode="tel"
        registration={form.register("phone")}
        error={form.formState.errors.phone}
      />
      <Field>
        <FieldLabel htmlFor="coach-bio">{t("setup.coaches.bio")}</FieldLabel>
        <Textarea id="coach-bio" rows={3} {...form.register("bio")} />
      </Field>
      <ImageField
        label={t("setup.photo")}
        folder="coaches"
        url={imageUrl}
        onChange={(key, url) => {
          form.setValue("image_key", key, { shouldDirty: true })
          setImageUrl(url)
        }}
      />
      <Controller
        control={form.control}
        name="active"
        render={({ field }) => (
          <ActiveSwitch
            id="coach-active"
            label={t("setup.bookable")}
            hint={t("setup.bookableHint")}
            checked={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </FieldGroup>
  )
}

/** /setup/coaches/:coachId — the coach's opening hours and price */
export function CoachDetailPage() {
  const { t } = useTranslation()
  const { coachId } = useParams()
  const coaches = useCoachesList()
  const settings = useSettings()
  const coach = coaches.data?.find((c) => c.id === Number(coachId))

  if (coaches.isPending || settings.isPending)
    return <Skeleton className="h-96 rounded-xl" />
  if (!coach || !settings.data)
    return <PageError error={coaches.error ?? settings.error} />

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" className="-ml-3 h-11 lg:h-9">
          <Link to="..">
            <ArrowLeftIcon />
            {t("setup.tabs.coaches")}
          </Link>
        </Button>
        <PageHeader
          title={coach.name}
          lead={coach.sports.map((s) => s.name).join(", ")}
        />
      </div>
      <CoachDetails key={coach.id} coach={coach} />
      <div className="grid gap-6 xl:grid-cols-2">
        <HoursEditor owner="coach" id={coach.id} />
        <PriceEditor
          owner="coach"
          id={coach.id}
          currency={settings.data.in_force.currency}
          // a coach of one sport follows that sport's rule; of several, the branch rule
          rule={
            coach.sports.length === 1 ? { sport_id: coach.sports[0].id } : {}
          }
        />
      </div>
    </div>
  )
}
