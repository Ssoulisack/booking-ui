import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { EmailVerify } from "@/components/global/EmailVerify"
import { ChangePasswordCard } from "./ChangePasswordCard"
import { useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"

import { ErrorAlert, SubmitButton, TextField } from "@/components/global/form"
import { PageTitle } from "@/components/global/page-state"
import HoldButton from "@/components/reactbits/HoldButton"
import { FieldGroup } from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUpdateProfile } from "@/hooks/use-auth"
import { IdentityFields } from "@/components/public/auth/IdentityFields"
import { safeNext } from "@/components/public/auth/landing"
import {
  profileSchema,
  type ProfileValues,
} from "@/components/public/auth/schemas"
import type { User } from "@/types/auth"
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
  const [params, setParams] = useSearchParams()
  const completing = params.get("complete") === "1"
  const tab = params.get("tab") === "password" ? "password" : "profile"
  if (!user) return null
  return (
    <>
      <div className="max-w-lg space-y-6">
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
        {completing ? (
          <ProfileForm
            key={user.updated_at + user.id}
            user={user}
            next={safeNext(params.get("next"))}
            completing
          />
        ) : (
          // two tabs, kept in the address (?tab=password) so a link can open the right one
          <Tabs
            value={tab}
            onValueChange={(v) =>
              setParams(
                (p) => {
                  const q = new URLSearchParams(p)
                  if (v === "password") q.set("tab", "password")
                  else q.delete("tab")
                  return q
                },
                { replace: true },
              )
            }
          >
            <TabsList className="h-11 w-full lg:h-9">
              <TabsTrigger value="profile" className="flex-1">
                {t("myAccountTabs.profile")}
              </TabsTrigger>
              <TabsTrigger value="password" className="flex-1">
                {t("myAccountTabs.password")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-4 space-y-6">
              <EmailVerify />
              <ProfileForm
                key={user.updated_at + user.id}
                user={user}
                next={safeNext(params.get("next"))}
                completing={false}
              />
            </TabsContent>
            <TabsContent value="password" className="mt-4">
              <ChangePasswordCard user={user} />
            </TabsContent>
          </Tabs>
        )}
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
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      phone: user.phone ? displayPhone(user.phone) : "",
      // a stand-in address is never shown: the field stays empty until a real one is added
      email: user.email_generated ? "" : user.email,
    },
  })
  const save = useUpdateProfile({
    onSuccess: () => {
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
          register={form.register}
          errors={form.formState.errors}
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
          backgroundColor="var(--brand-soft)"
          textColor="var(--brand-ink)"
          fillColor="var(--brand)"
          fillTextColor="var(--brand-foreground)"
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
