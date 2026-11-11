import {
  ArrowLeftIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  SendIcon,
  UserPlusIcon,
  UserRoundIcon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { displayPhone } from "@/lib/phone"
import {
  DeleteButton,
  PageHeader,
  Panel,
} from "@/components/protected/branch/ui"
import type { BranchSummary } from "@/types/company"

import { useBranches } from "@/hooks/use-company"
import {
  useCancelInvitation,
  useInvitations,
  useInvite,
  useResendInvitation,
  useAddTeamMember,
  useTeamCandidate,
} from "@/hooks/use-team"
import { BranchPicker, RolePicker, type Role } from "./team-ui"

/**
 * /company/team/invite — add employees: by email (an invitation), or by phone for someone without email (they register
 * on the site first, then are found here and added straight away), and the invitations not used yet
 */
export function InvitePage() {
  const { t } = useTranslation()
  const branches = useBranches()
  const open = (branches.data ?? []).filter((b) => b.status !== "closed")
  const [tab, setTab] = useState("email")
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" className="-ml-3 h-11 lg:h-9">
        <Link to="/company/team">
          <ArrowLeftIcon />
          {t("nav.team")}
        </Link>
      </Button>
      <PageHeader
        title={t("company.invite")}
        lead={tab === "email" ? t("company.inviteLead") : undefined}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-11 lg:h-9">
          <TabsTrigger value="email" className="px-3">
            <MailIcon />
            {t("team.byEmail")}
          </TabsTrigger>
          <TabsTrigger value="phone" className="px-3">
            <PhoneIcon />
            {t("team.byPhone")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="mt-4">
          <InvitePanel branches={open} />
        </TabsContent>
        <TabsContent value="phone" className="mt-4">
          <AddByPhonePanel branches={open} />
        </TabsContent>
      </Tabs>
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

/** Someone without email: they register first (with their phone), then are found here and added with a role */
function AddByPhonePanel({ branches }: { branches: BranchSummary[] }) {
  const { t } = useTranslation()
  const [text, setText] = useState("")
  const [q, setQ] = useState("")
  const found = useTeamCandidate(q)
  const add = useAddTeamMember()
  const [role, setRole] = useState<Role>("staff")
  const [branchIds, setBranchIds] = useState<number[]>([])
  const person = found.data

  return (
    <Panel>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("team.byPhoneLead")}</p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            add.reset()
            setQ(text.trim())
          }}
        >
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label htmlFor="add-phone">{t("team.phoneOrNo")}</Label>
            <Input
              id="add-phone"
              inputMode="tel"
              placeholder="2055551234 / CNO000042"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-11 text-base lg:h-9 lg:text-sm"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="h-11 lg:h-9"
            disabled={!text.trim() || found.isFetching}
          >
            {found.isFetching ? <Spinner /> : <SearchIcon />}
            {t("team.find")}
          </Button>
        </form>
        <ErrorAlert error={found.error} />
        {person && (
          <form
            className="space-y-4 rounded-lg border p-4"
            onSubmit={(e) => {
              e.preventDefault()
              add.mutate(
                {
                  user_id: person.user_id,
                  role,
                  branch_ids: role === "admin" ? [] : branchIds,
                },
                {
                  onSuccess: () => {
                    toast.success(t("team.added", { name: person.name }))
                    setText("")
                    setQ("")
                    setBranchIds([])
                  },
                },
              )
            }}
          >
            <div className="flex items-start gap-3">
              <UserRoundIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium">{person.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[
                    person.member_no,
                    person.phone && displayPhone(person.phone),
                    person.email || t("company.noEmail"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            {person.in_team ? (
              <p className="text-sm text-muted-foreground">
                {t("team.alreadyInTeam")}
              </p>
            ) : (
              <>
                <div className="w-40 space-y-1.5">
                  <Label htmlFor="add-role">{t("team.role")}</Label>
                  <RolePicker id="add-role" value={role} onChange={setRole} />
                </div>
                {role === "admin" ? (
                  <p className="text-sm text-muted-foreground">
                    {t("company.adminHint")}
                  </p>
                ) : (
                  <BranchPicker
                    idPrefix="add-branch"
                    branches={branches}
                    value={branchIds}
                    onChange={setBranchIds}
                  />
                )}
                <ErrorAlert error={add.error} />
                <Button
                  type="submit"
                  className="h-11 lg:h-9"
                  disabled={
                    add.isPending ||
                    (role !== "admin" && branchIds.length === 0)
                  }
                >
                  {add.isPending ? <Spinner /> : <UserPlusIcon />}
                  {t("team.addToTeam")}
                </Button>
              </>
            )}
          </form>
        )}
      </div>
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
