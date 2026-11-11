import { SearchIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { PageError } from "@/components/global/page-state"
import { useDashboard } from "@/components/provider/dashboard-context"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { roleAtLeast } from "@/lib/constants/roles"
import { displayPhone } from "@/lib/phone"
import type { BranchTeamMember } from "@/types/team"

import {
  useBranchTeam,
  useRemoveFromBranch,
  useSetBranchAccess,
} from "@/hooks/use-team"
import { DeleteButton, PageHeader } from "./ui"

const ROLES = ["", "owner", "admin", "manager", "staff"] as const

/**
 * /dashboard/:id/employees — who works at this branch, by role, found by phone or member number. The owner and
 * admins switch a manager's or staff member's access off, or take them off the branch: from their next page they
 * see the site as a customer here. The owner and admins themselves are managed on the company Team page.
 */
export function EmployeesPage() {
  const { t } = useTranslation()
  const { branch } = useDashboard()
  const canManage = roleAtLeast(branch.role, "admin")
  const [role, setRole] = useState("")
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const team = useBranchTeam(role, q)

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("nav.employees")}
        lead={t(canManage ? "employees.leadAdmin" : "employees.lead")}
      />
      <Tabs value={role} onValueChange={setRole}>
        <TabsList className="h-11 max-w-full overflow-x-auto lg:h-9">
          {ROLES.map((r) => (
            <TabsTrigger key={r || "all"} value={r} className="px-3">
              {r ? t(`roles.${r}`) : t("employees.all")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <form
        className="relative max-w-md"
        onSubmit={(e) => {
          e.preventDefault()
          setQ(search.trim())
        }}
      >
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t("employees.search")}
          placeholder={t("employees.search")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!e.target.value) setQ("")
          }}
          className="h-11 pl-9 text-base lg:h-9 lg:text-sm"
        />
      </form>
      {team.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : team.isError ? (
        <PageError error={team.error} onRetry={() => team.refetch()} />
      ) : team.data.length === 0 ? (
        <p className="rounded-xl bg-background p-6 text-muted-foreground ring-1 ring-border">
          {t("employees.none")}
        </p>
      ) : (
        <ul className="divide-y rounded-xl bg-background ring-1 ring-border">
          {team.data.map((m) => (
            <EmployeeRow key={m.user_id} member={m} canManage={canManage} />
          ))}
        </ul>
      )}
    </div>
  )
}

function EmployeeRow({
  member: m,
  canManage,
}: {
  member: BranchTeamMember
  canManage: boolean
}) {
  const { t } = useTranslation()
  const access = useSetBranchAccess()
  const [removing, setRemoving] = useState(false)
  const remove = useRemoveFromBranch()
  // the owner and admins work at every branch: they are changed on the company Team page
  const companyWide = m.role === "owner" || m.role === "admin"

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-56 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {m.name}
          <Badge variant="secondary">{t(`roles.${m.role}`)}</Badge>
          {!m.active && (
            <Badge className="border-0 bg-rose-100 text-rose-900 dark:bg-rose-400/20 dark:text-rose-200">
              {t("employees.accessOff")}
            </Badge>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {[
            m.member_no,
            m.phone && displayPhone(m.phone),
            m.email || t("company.noEmail"),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {canManage &&
        (companyWide ? (
          <Link
            to="/company/team"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("employees.onTeamPage")}
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <label className="flex h-11 items-center gap-2 text-sm lg:h-9">
              <Switch
                checked={m.active}
                disabled={access.isPending}
                onCheckedChange={(active) =>
                  access.mutate(
                    { userId: m.user_id, active },
                    {
                      onSuccess: () =>
                        toast.success(
                          t(
                            active
                              ? "employees.accessOnDone"
                              : "employees.accessOffDone",
                            {
                              name: m.name,
                            },
                          ),
                        ),
                    },
                  )
                }
              />
              {t("employees.access")}
            </label>
            <DeleteButton
              what={m.name}
              label={t("employees.remove")}
              title={t("employees.removeTitle", { name: m.name })}
              description={t("employees.removeLead")}
              open={removing}
              onOpenChange={setRemoving}
              pending={remove.isPending}
              error={remove.error}
              onConfirm={() =>
                remove.mutate(m.user_id, {
                  onSuccess: () => {
                    setRemoving(false)
                    toast.success(t("employees.removed", { name: m.name }))
                  },
                })
              }
            />
          </div>
        ))}
      <ErrorAlert error={access.error} />
    </li>
  )
}
