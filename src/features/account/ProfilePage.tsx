import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"

import { ErrorAlert, SubmitButton, TextField } from "@/components/form"
import { PageTitle } from "@/components/page-state"
import HoldButton from "@/components/reactbits/HoldButton"
import { FieldGroup } from "@/components/ui/field"
import { authApi, authKeys } from "@/features/auth/api"
import { IdentityFields } from "@/features/auth/IdentityFields"
import { safeNext } from "@/features/auth/landing"
import { profileSchema, type ProfileValues } from "@/features/auth/schemas"
import type { User } from "@/lib/api/types"
import { displayPhone } from "@/lib/phone"
import { useSession } from "@/stores/session"

// how long Save is held
const HOLD_MS = 1000

/**
 * /account/profile — the person's own name, nationality, phone and email, and the customer (or employee) number
 * to tell staff. With ?complete=1 it is the one-time question for accounts without a nationality.
 */
export function ProfilePage() {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const [params] = useSearchParams()
  const completing = params.get("complete") === "1"
  if (!user) return null
  return (
    <>
      <div className="mx-auto max-w-lg space-y-6">
        <PageTitle
          title={completing ? t("identity.completeTitle") : t("identity.title")}
          lead={completing ? t("identity.completeLead") : undefined}
        />
        <div className="rounded-xl bg-background p-4 ring-1 ring-border">
          <p className="text-sm text-muted-foreground">
            {user.member_no.startsWith("ENO")
              ? t("identity.employeeNo")
              : t("identity.customerNo")}
          </p>
          <p className="text-3xl font-semibold tracking-wider">
            {user.member_no}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.phone
              ? t("identity.tellStaff", { phone: displayPhone(user.phone) })
              : t("identity.tellStaffNoPhone")}
          </p>
        </div>
        <ProfileForm
          key={user.updated_at + user.id}
          user={user}
          next={safeNext(params.get("next"))}
          completing={completing}
        />
      </div>
    </>
  )
}

function ProfileForm({
  user,
  next,
  completing,
}: {
  user: User
  next: string | null
  completing: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      nationality: user.nationality,
      phone: user.phone ? displayPhone(user.phone) : "",
      // a stand-in address is never shown: the field stays empty until a real one is added
      email: user.email_generated ? "" : user.email,
    },
  })
  const nationality = useWatch({ control: form.control, name: "nationality" })
  const save = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (updated) => {
      useSession.getState().setUser(updated)
      queryClient.setQueryData(authKeys.me, updated)
      toast.success(t("identity.saved"))
      if (completing) navigate(next ?? "/", { replace: true })
    },
  })

  return (
    <form
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
      noValidate
      className="space-y-5 rounded-xl bg-background p-4 ring-1 ring-border sm:p-6"
    >
      <ErrorAlert error={save.error} />
      <FieldGroup>
        <TextField
          label={t("fields.name")}
          autoComplete="name"
          registration={form.register("name")}
          error={form.formState.errors.name}
        />
        <IdentityFields
          control={form.control}
          register={form.register}
          errors={form.formState.errors}
          nationality={nationality}
        />
      </FieldGroup>
      {completing ? (
        <SubmitButton pending={save.isPending}>
          {t("identity.continue")}
        </SubmitButton>
      ) : (
        // hold, not tap: no accidental changes to the person's own details
        <HoldButton
          className="w-full"
          backgroundColor="#dcfce7"
          textColor="#166534"
          fillColor="#16a34a"
          fillTextColor="#ffffff"
          radius={10}
          holdTime={HOLD_MS}
          resetAfter={1500}
          disabled={save.isPending}
          doneLabel={t("identity.saving")}
          hint={t("identity.holdHint", { seconds: HOLD_MS / 1000 })}
          onHold={() => void form.handleSubmit((v) => save.mutate(v))()}
        >
          {t("identity.holdToSave")}
        </HoldButton>
      )}
    </form>
  )
}
