import { zodResolver } from "@hookform/resolvers/zod"
import { type UseMutationResult } from "@tanstack/react-query"
import { MailOpenIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"

import { ErrorAlert, SubmitButton, TextField } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import type { AuthResponse, InvitationInfo } from "@/types/auth"
import { AuthHeading } from "@/components/layout/AuthLayout"
import { useCurrentBranch } from "@/stores/branch"
import { useSession } from "@/stores/session"

import { useAcceptInvitation, useInvitation, useSmsOn } from "@/hooks/use-auth"
import { displayPhone } from "@/lib/phone"
import { type AcceptInput } from "@/types/auth"
import { AuthSteps } from "./AuthSteps"
import { homePath } from "./landing"
import { PhoneCodeStep } from "./PhoneCodeStep"
import { PhoneStep, ProvedPhone } from "./PhoneStep"
import { acceptNewSchema, type AcceptNewValues } from "./schemas"

/** Opened from the invite email: /invite/{token} */
export function AcceptInvitePage() {
  const { t } = useTranslation()
  const { token = "" } = useParams()
  const info = useInvitation(token)

  if (info.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    )
  }

  if (info.isError) {
    return (
      <div className="space-y-5">
        <AuthHeading title={t("invite.title")} />
        <ErrorAlert error={info.error} />
        <Button asChild variant="outline" className="h-11 w-full lg:h-9">
          <Link to="/">{t("actions.goHome")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <MailOpenIcon className="mb-4 size-10 text-[var(--primary-ink)]" />
      <AuthHeading title={t("invite.title")} />
      <p className="mb-1">
        <Trans
          t={t}
          i18nKey="invite.lead"
          values={{
            company: info.data.company_name,
            role: t(`roles.${info.data.role}`),
            where:
              info.data.branches.length > 0
                ? info.data.branches.join(", ")
                : t("invite.everyBranch"),
          }}
          components={{ strong: <strong /> }}
        />
      </p>
      <p className="mb-6 text-sm text-muted-foreground">
        {t("invite.sentTo", { email: info.data.email })}
      </p>
      <InviteAction token={token} info={info.data} />
    </>
  )
}

function InviteAction({
  token,
  info,
}: {
  token: string
  info: InvitationInfo
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const signOut = useSession((s) => s.signOut)

  const accept = useAcceptInvitation(token, {
    onSuccess: (auth, list) => {
      // open the company area (admin) or the first branch joined
      const joined = list.find((b) => info.branches.includes(b.name))
      useCurrentBranch.getState().setCurrentId(joined?.branch_id ?? null)
      toast.success(t("invite.accepted", { company: info.company_name }))
      navigate(homePath(auth.user, list), { replace: true })
    },
  })

  const here = `/invite/${encodeURIComponent(token)}`
  const loginLink = `/login?next=${encodeURIComponent(here)}&email=${encodeURIComponent(info.email)}`
  const isInvitedUser =
    !!user && user.email.toLowerCase() === info.email.toLowerCase()

  // logged in as somebody else: switch account first
  if (user && !isInvitedUser) {
    return (
      <div className="space-y-4">
        <p className="text-sm">
          {t("invite.wrongAccount", { current: user.email, email: info.email })}
        </p>
        <Button
          size="lg"
          className="h-11 w-full lg:h-9"
          onClick={() => {
            signOut()
            navigate(info.account_exists ? loginLink : here, { replace: true })
          }}
        >
          {t("invite.switchAccount")}
        </Button>
      </div>
    )
  }

  if (info.account_exists) {
    if (!user) {
      return (
        <div className="space-y-4">
          <p className="text-sm">
            {t("invite.loginFirst", { email: info.email })}
          </p>
          <Button asChild size="lg" className="h-11 w-full lg:h-9">
            <Link to={loginLink}>{t("invite.loginToAccept")}</Link>
          </Button>
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <ErrorAlert error={accept.error} />
        <form
          onSubmit={(e) => {
            e.preventDefault()
            accept.mutate({})
          }}
        >
          <SubmitButton pending={accept.isPending}>
            {t("invite.accept")}
          </SubmitButton>
        </form>
      </div>
    )
  }

  return <NewAccountForm company={info.company_name} accept={accept} />
}

const STEPS = [
  "registerSteps.phone",
  "registerSteps.code",
  "registerSteps.details",
]

/**
 * A new account for the invited email. The phone is required; with SMS codes on it goes step by step like register:
 * 1 the phone → 2 the code texted to it (checked at once) → 3 name and password. With SMS codes off: one form.
 */
function NewAccountForm({
  company,
  accept,
}: {
  company: string
  accept: UseMutationResult<AuthResponse, Error, AcceptInput>
}) {
  const { t } = useTranslation()
  const smsOn = useSmsOn()
  const [step, setStep] = useState<"phone" | "code" | "details">("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")

  if (!smsOn) return <AccountDetails company={company} accept={accept} />

  if (step === "code")
    return (
      <>
        <AuthSteps step={2} labels={STEPS} />
        <PhoneCodeStep
          phone={phone.trim()}
          purpose="register"
          subtitle={t("smsCode.sentTo", { phone: displayPhone(phone.trim()) })}
          onConfirmed={(right) => {
            setCode(right)
            setStep("details")
          }}
          onChangePhone={() => setStep("phone")}
        />
      </>
    )

  if (step === "details")
    return (
      <>
        <AuthSteps step={3} labels={STEPS} />
        <AccountDetails
          company={company}
          accept={accept}
          proved={{
            phone: phone.trim(),
            code,
            onChange: () => {
              setCode("")
              setStep("phone")
            },
          }}
        />
      </>
    )

  return (
    <div className="space-y-4">
      <AuthSteps step={1} labels={STEPS} />
      <p className="text-sm text-muted-foreground">
        {t("registerSteps.phoneLead")}
      </p>
      <PhoneStep
        phone={phone}
        onPhone={setPhone}
        onSent={() => setStep("code")}
      />
    </div>
  )
}

/** Name and password (and the phone, unless it was already proved with an SMS code: then it is shown, with Change) */
function AccountDetails({
  company,
  accept,
  proved,
}: {
  company: string
  accept: UseMutationResult<AuthResponse, Error, AcceptInput>
  proved?: { phone: string; code: string; onChange: () => void }
}) {
  const { t } = useTranslation()
  const form = useForm<AcceptNewValues>({
    resolver: zodResolver(acceptNewSchema),
    defaultValues: {
      name: "",
      phone: proved?.phone ?? "",
      password: "",
      confirm: "",
    },
  })
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(({ name, phone, password }) =>
        accept.mutate(
          proved
            ? { name, password, phone: proved.phone, phone_code: proved.code }
            : { name, phone, password },
        ),
      )}
      noValidate
      className="space-y-5"
    >
      <p className="text-sm text-muted-foreground">
        {t("invite.createAccount")}
      </p>
      <ErrorAlert error={accept.error} />
      {proved && (
        <ProvedPhone phone={proved.phone} onChange={proved.onChange} />
      )}
      <FieldGroup>
        <TextField
          label={t("fields.name")}
          autoComplete="name"
          registration={form.register("name")}
          error={errors.name}
        />
        {!proved && (
          <TextField
            label={t("identity.phoneLao")}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            registration={form.register("phone")}
            error={errors.phone}
          />
        )}
        <TextField
          label={t("fields.password")}
          type="password"
          autoComplete="new-password"
          registration={form.register("password")}
          error={errors.password}
        />
        <TextField
          label={t("fields.confirmPassword")}
          type="password"
          autoComplete="new-password"
          registration={form.register("confirm")}
          error={errors.confirm}
        />
      </FieldGroup>
      <SubmitButton pending={accept.isPending}>
        {t("invite.submitNew", { company })}
      </SubmitButton>
    </form>
  )
}
