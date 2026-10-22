import { CrownIcon, SearchIcon, UserPlusIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { PageError } from "@/components/page-state"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  ActiveSwitch,
  DeleteButton,
  FormDialog,
  PageHeader,
  Panel,
} from "@/features/dashboard/ui"
import type { BranchSummary, MemberRole, TeamMember } from "@/lib/api/types"
import { displayPhone } from "@/lib/phone"
import { useSession } from "@/stores/session"

import {
  useBranches,
  useInvitations,
  useRemoveTeamMember,
  useTeam,
  useTransferOwnership,
  useUpdateTeamMember,
} from "./api"
import { matchesMember } from "./team-filter"
import { paginate } from "./paging"
import { Pager } from "./ui"
import { BranchPicker, RolePicker, type Role } from "./team-ui"

/**
 * /company/team — Employees: the owner and admins (every branch), managers and staff (their
 * branches), with a search and a branch filter. Invitations have their own page. Only the owner
 * adds or changes admins.
 */
export function TeamPage() {
  const { t } = useTranslation()
  const team = useTeam()
  const branches = useBranches()
  const open = (branches.data ?? []).filter((b) => b.status !== "closed")

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t("nav.team")}
        lead={t("company.teamLead")}
        actions={<InviteLink />}
      />
      <Panel title={t("company.people")}>
        {team.isPending ? (
          <Skeleton className="h-32" />
        ) : team.isError ? (
          <PageError error={team.error} onRetry={() => team.refetch()} />
        ) : (
          <PeopleList
            team={team.data}
            branches={branches.data ?? []}
            open={open}
          />
        )}
      </Panel>
    </div>
  )
}

const FILTER =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base sm:w-auto sm:max-w-56 lg:h-9 lg:text-sm"

/** The people, with a search and branch, role and access pickers kept in the address */
function PeopleList({
  team,
  branches,
  open,
}: {
  team: TeamMember[]
  branches: BranchSummary[]
  open: BranchSummary[]
}) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const q = params.get("q") ?? ""
  const branch = Number(params.get("branch")) || 0
  const role = (params.get("role") ?? "") as TeamMember["role"] | ""
  const access = (params.get("access") ?? "") as "on" | "off" | ""
  const shown = team.filter((m) =>
    matchesMember(m, { q, branch, role, access }),
  )
  const [page, setPage] = useState(1)
  const paged = paginate(shown, page)

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
    setPage(1)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("team.search")}
            placeholder={t("team.searchPlaceholder")}
            value={q}
            onChange={(e) => set("q", e.target.value)}
            className="h-11 pl-9 lg:h-9"
          />
        </div>
        {/* native pickers: the phone's own list, and typing jumps to a branch however many there are */}
        <select
          aria-label={t("team.branch")}
          value={String(branch)}
          onChange={(e) =>
            set("branch", e.target.value === "0" ? "" : e.target.value)
          }
          className={FILTER}
        >
          <option value="0">{t("team.allBranches")}</option>
          {[...branches]
            .sort((x, y) => x.name.localeCompare(y.name))
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
        </select>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <select
            aria-label={t("team.role")}
            value={role}
            onChange={(e) => set("role", e.target.value)}
            className={FILTER}
          >
            <option value="">{t("team.allRoles")}</option>
            {(["owner", "admin", "manager", "staff"] as const).map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
          <select
            aria-label={t("team.access")}
            value={access}
            onChange={(e) => set("access", e.target.value)}
            className={FILTER}
          >
            <option value="">{t("team.allAccess")}</option>
            <option value="on">{t("team.accessOn")}</option>
            <option value="off">{t("company.accessOff")}</option>
          </select>
        </div>
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {q || branch || role || access
          ? t("team.shown", { count: shown.length, total: team.length })
          : t("team.count", { count: team.length })}
      </p>
      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground">
          {t("team.noMatch")}
        </p>
      ) : (
        // a phone scrolls the table sideways inside its box
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[50rem] text-sm">
            <thead className="border-b text-left whitespace-nowrap text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">{t("team.colNo")}</th>
                <th className="py-2 pr-3 font-medium">{t("team.colName")}</th>
                <th className="py-2 pr-3 font-medium">{t("fields.email")}</th>
                <th className="py-2 pr-3 font-medium">{t("team.colPhone")}</th>
                <th className="py-2 pr-3 font-medium">{t("team.role")}</th>
                <th className="py-2 pr-3 font-medium">
                  {t("team.colBranches")}
                </th>
                <th className="py-2 pr-3 font-medium">{t("team.access")}</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">{t("team.colActions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paged.items.map((m) => (
                <MemberRow key={m.user_id} member={m} branches={open} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager meta={paged.meta} page={paged.page} onPage={setPage} />
    </div>
  )
}

function MemberRow({
  member: m,
  branches,
}: {
  member: TeamMember
  branches: BranchSummary[]
}) {
  const { t } = useTranslation()
  const me = useSession((s) => s.user)
  const isMe = me?.id === m.user_id
  const iAmOwner = me?.company_role === "owner"
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState(false)
  const remove = useRemoveTeamMember()
  // the owner changes only through "make owner"; only the owner manages admins
  const canManage =
    !isMe && m.role !== "owner" && (m.role !== "admin" || iAmOwner)

  const everyBranch = m.role === "owner" || m.role === "admin"
  const branchNames = m.branches.map((b) => b.name)

  return (
    <tr className="align-middle">
      <td className="py-3 pr-3 font-mono text-xs whitespace-nowrap">
        {m.member_no}
      </td>
      <td className="py-3 pr-3 font-medium whitespace-nowrap">
        {m.name}
        {isMe && (
          <span className="ml-1.5 text-sm font-normal text-muted-foreground">
            ({t("team.you")})
          </span>
        )}
      </td>
      <td className="max-w-44 truncate py-3 pr-3" title={m.email}>
        {m.email || "–"}
      </td>
      <td className="py-3 pr-3 whitespace-nowrap">
        {m.phone ? displayPhone(m.phone) : "–"}
      </td>
      <td className="py-3 pr-3">
        <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
          {m.role === "owner" && <CrownIcon className="size-3.5" />}
          {t(`roles.${m.role}`)}
        </Badge>
      </td>
      <td
        className="max-w-44 truncate py-3 pr-3 text-muted-foreground"
        title={everyBranch ? undefined : branchNames.join(", ")}
      >
        {everyBranch
          ? t("company.everyBranch")
          : branchNames.length > 2
            ? t("team.branchesMore", {
                names: branchNames.slice(0, 2).join(", "),
                count: branchNames.length - 2,
              })
            : branchNames.join(", ")}
      </td>
      <td className="py-3 pr-3">
        {m.active ? (
          <Badge className="border-0 bg-emerald-100 text-emerald-900">
            {t("team.accessOn")}
          </Badge>
        ) : (
          <Badge className="border-0 bg-rose-100 text-rose-900">
            {t("company.accessOff")}
          </Badge>
        )}
      </td>
      <td className="py-3">
        {canManage && (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              onClick={() => setEditing(true)}
            >
              {t("dash.edit")}
            </Button>
            {iAmOwner && m.role === "admin" && <MakeOwner member={m} />}
            <DeleteButton
              what={m.name}
              open={removing}
              onOpenChange={setRemoving}
              pending={remove.isPending}
              error={remove.error}
              onConfirm={() =>
                remove.mutate(m.user_id, {
                  onSuccess: () => setRemoving(false),
                })
              }
            />
          </div>
        )}
        {editing && (
          <EditMember
            member={m}
            branches={branches}
            onClose={() => setEditing(false)}
          />
        )}
      </td>
    </tr>
  )
}

function EditMember({
  member: m,
  branches,
  onClose,
}: {
  member: TeamMember
  branches: BranchSummary[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const update = useUpdateTeamMember()
  const [role, setRole] = useState<Role>(
    m.role === "admin" ? "admin" : (m.role as MemberRole),
  )
  const [branchIds, setBranchIds] = useState(m.branches.map((b) => b.id))
  const [active, setActive] = useState(m.active)

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("company.editMember", { name: m.name })}
      submitLabel={t("dash.save")}
      pending={update.isPending}
      error={update.error}
      onSubmit={(e) => {
        e.preventDefault()
        update.mutate(
          {
            id: m.user_id,
            role,
            branch_ids: role === "admin" ? [] : branchIds,
            active,
          },
          {
            onSuccess: () => {
              toast.success(t("settings.saved"))
              onClose()
            },
          },
        )
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="edit-role">{t("team.role")}</Label>
        <RolePicker id="edit-role" value={role} onChange={setRole} />
      </div>
      {role === "admin" ? (
        <p className="text-sm text-muted-foreground">
          {t("company.adminHint")}
        </p>
      ) : (
        <>
          <BranchPicker
            idPrefix="edit-branch"
            branches={branches}
            value={branchIds}
            onChange={setBranchIds}
          />
          <ActiveSwitch
            id="edit-active"
            label={t("team.access")}
            hint={t("company.accessHint")}
            checked={active}
            onChange={setActive}
          />
        </>
      )}
    </FormDialog>
  )
}

/** The owner hands the company to an admin; the old owner becomes an admin */
function MakeOwner({ member: m }: { member: TeamMember }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const transfer = useTransferOwnership()
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="h-11 lg:h-9">
          {t("team.makeOwner")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("team.transferTitle", { name: m.name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("company.transferLead")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorAlert error={transfer.error} />
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 lg:h-9">
            {t("dash.cancel")}
          </AlertDialogCancel>
          <Button
            className="h-11 lg:h-9"
            disabled={transfer.isPending}
            onClick={() =>
              transfer.mutate(m.user_id, {
                onSuccess: () => {
                  setOpen(false)
                  // the session still says "owner": reload so menus follow the new role
                  window.location.assign("/company")
                },
              })
            }
          >
            {transfer.isPending && <Spinner />}
            {t("team.transfer")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** "Invite" opens the invitations page; it also says how many are still waiting */
function InviteLink() {
  const { t } = useTranslation()
  const waiting = useInvitations().data?.length ?? 0
  return (
    <Button asChild className="h-11 lg:h-9">
      <Link to="/company/team/invite">
        <UserPlusIcon />
        {t("team.inviteButton")}
        {waiting > 0 && (
          <span className="rounded-full bg-primary-foreground/20 px-2 text-xs">
            {t("team.waiting", { count: waiting })}
          </span>
        )}
      </Link>
    </Button>
  )
}
