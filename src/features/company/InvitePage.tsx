import { ArrowLeftIcon, MailIcon, SendIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { DeleteButton, PageHeader, Panel } from "@/features/dashboard/ui"
import type { BranchSummary } from "@/lib/api/types"

import {
  useBranches,
  useCancelInvitation,
  useInvitations,
  useInvite,
  useResendInvitation,
} from "./api"
import { BranchPicker, RolePicker, type Role } from "./team-ui"

/** /company/team/invite — invite employees by email, and the invitations not used yet */
export function InvitePage() {
  const { t } = useTranslation()
  const branches = useBranches()
  const open = (branches.data ?? []).filter((b) => b.status !== "closed")
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" className="-ml-3 h-11 lg:h-9">
        <Link to="/company/team">
          <ArrowLeftIcon />
          {t("nav.team")}
        </Link>
      </Button>
      <PageHeader title={t("company.invite")} lead={t("company.inviteLead")} />
      <InvitePanel branches={open} />
      <PendingInvitations />
    </div>
  )
}

function InvitePanel({ branches }: { branches: BranchSummary[] }) {
  const { t } = useTranslation()
  const invite = useInvite()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("staff")
  const [branchIds, setBranchIds] = useState<number[]>([])

  return (
    <Panel>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          invite.mutate(
            {
              email: email.trim(),
              role,
              branch_ids: role === "admin" ? [] : branchIds,
            },
            {
              onSuccess: () => {
                toast.success(t("team.invited", { email: email.trim() }))
                setEmail("")
                setBranchIds([])
              },
            },
          )
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label htmlFor="invite-email">{t("fields.email")}</Label>
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 text-base lg:h-9 lg:text-sm"
            />
          </div>
          <div className="w-40 space-y-1.5">
            <Label htmlFor="invite-role">{t("team.role")}</Label>
            <RolePicker id="invite-role" value={role} onChange={setRole} />
          </div>
        </div>
        {role === "admin" ? (
          <p className="text-sm text-muted-foreground">
            {t("company.adminHint")}
          </p>
        ) : (
          <BranchPicker
            idPrefix="invite-branch"
            branches={branches}
            value={branchIds}
            onChange={setBranchIds}
          />
        )}
        <ErrorAlert error={invite.error} />
        <Button
          type="submit"
          className="h-11 lg:h-9"
          disabled={
            invite.isPending ||
            !email.trim() ||
            (role !== "admin" && branchIds.length === 0)
          }
        >
          {invite.isPending ? <Spinner /> : <SendIcon />}
          {t("team.send")}
        </Button>
      </form>
    </Panel>
  )
}

function PendingInvitations() {
  const { t } = useTranslation()
  const invitations = useInvitations()
  const resend = useResendInvitation()
  const cancel = useCancelInvitation()
  const [open, setOpen] = useState<number | null>(null)
  if (!invitations.data || invitations.data.length === 0) return null
  return (
    <Panel title={t("team.pending")}>
      <ul className="divide-y">
        {invitations.data.map((inv) => (
          <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
            <MailIcon className="size-4 text-muted-foreground" />
            <div className="min-w-48 flex-1">
              <p className="font-medium">{inv.email}</p>
              <p className="text-sm text-muted-foreground">
                {t(`roles.${inv.role}`)} ·{" "}
                {inv.role === "admin"
                  ? t("company.everyBranch")
                  : inv.branches.map((b) => b.name).join(", ")}{" "}
                ·{" "}
                {t("team.expires", {
                  date: new Date(inv.expires_at).toLocaleDateString(),
                })}
              </p>
            </div>
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              disabled={resend.isPending}
              onClick={() =>
                resend.mutate(inv.id, {
                  onSuccess: () =>
                    toast.success(t("team.invited", { email: inv.email })),
                })
              }
            >
              {t("team.resend")}
            </Button>
            <DeleteButton
              what={inv.email}
              open={open === inv.id}
              onOpenChange={(o) => setOpen(o ? inv.id : null)}
              pending={cancel.isPending}
              error={cancel.error}
              onConfirm={() =>
                cancel.mutate(inv.id, { onSuccess: () => setOpen(null) })
              }
            />
          </li>
        ))}
      </ul>
      <ErrorAlert error={resend.error} />
    </Panel>
  )
}
