import {
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { PageError } from "@/components/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { EmptyState, PageHeader } from "@/features/dashboard/ui"
import type { User } from "@/lib/api/types"
import { displayPhone } from "@/lib/phone"
import { useSession } from "@/stores/session"

import {
  readablePassword,
  useSetPassword,
  useUserStatus,
  useUsers,
} from "./api"
import { Pager } from "./ui"

/** /company/users — every account; find by name, email, phone or member number (CNO / ENO) */
export function UsersPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const keyword = params.get("q") ?? ""
  const page = Number(params.get("page") ?? 1) || 1
  const [search, setSearch] = useState(keyword)
  const [resetting, setResetting] = useState<User | null>(null)
  const users = useUsers({ keyword, page })

  const go = (q: string, p = 1) => {
    const next = new URLSearchParams()
    if (q) next.set("q", q)
    if (p > 1) next.set("page", String(p))
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("nav.users")} lead={t("company.usersLead")} />
      <form
        className="relative max-w-md"
        onSubmit={(e) => {
          e.preventDefault()
          go(search.trim())
        }}
      >
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t("company.search")}
          placeholder={t("company.userSearch")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!e.target.value) go("")
          }}
          className="h-11 pl-9 text-base lg:h-9 lg:text-sm"
        />
      </form>
      {users.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : users.isError ? (
        <PageError error={users.error} onRetry={() => users.refetch()} />
      ) : users.data.items.length === 0 ? (
        <EmptyState text={t("company.noUsers")} />
      ) : (
        <ul className="divide-y rounded-xl bg-background ring-1 ring-border">
          {users.data.items.map((u) => (
            <UserRow key={u.id} user={u} onReset={() => setResetting(u)} />
          ))}
        </ul>
      )}
      <Pager
        meta={users.data?.meta}
        page={page}
        onPage={(p) => go(keyword, p)}
      />
      {resetting && (
        <SetPasswordDialog
          user={resetting}
          onClose={() => setResetting(null)}
        />
      )}
    </div>
  )
}

function UserRow({ user: u, onReset }: { user: User; onReset: () => void }) {
  const { t } = useTranslation()
  const me = useSession((s) => s.user)
  const status = useUserStatus()
  const contact = [
    u.member_no,
    u.phone && displayPhone(u.phone),
    u.email_generated ? t("company.noEmail") : u.email,
    u.nationality,
  ].filter(Boolean)

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-56 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {u.name}
          {u.company_role !== "" && (
            <Badge variant="secondary">{t(`roles.${u.company_role}`)}</Badge>
          )}
          {!u.status && (
            <Badge className="border-0 bg-rose-100 text-rose-900">
              {t("company.switchedOff")}
            </Badge>
          )}
        </p>
        <p className="text-sm text-muted-foreground">{contact.join(" · ")}</p>
      </div>
      <label className="flex h-11 items-center gap-2 text-sm lg:h-9">
        <Switch
          checked={u.status}
          disabled={me?.id === u.id || status.isPending}
          onCheckedChange={(on) =>
            status.mutate(
              { id: u.id, status: on },
              {
                onSuccess: () =>
                  toast.success(
                    on
                      ? t("company.accessOn", { name: u.name })
                      : t("company.accessOff", { name: u.name }),
                  ),
              },
            )
          }
        />
        {t("team.access")}
      </label>
      <Button variant="outline" className="h-11 lg:h-9" onClick={onReset}>
        <KeyRoundIcon />
        {t("company.setPassword")}
      </Button>
      {status.error && (
        <div className="w-full">
          <ErrorAlert error={status.error} />
        </div>
      )}
    </li>
  )
}

/**
 * Suggests a readable password the Super Admin can change, saves it, then shows it once to
 * tell the person (by phone). Their other logins end.
 */
function SetPasswordDialog({
  user,
  onClose,
}: {
  user: User
  onClose: () => void
}) {
  const { t } = useTranslation()
  const save = useSetPassword()
  const [password, setPassword] = useState(() => readablePassword())
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const tooShort = password.trim().length < 8

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {saved
              ? t("company.passwordSetTitle")
              : t("company.setPasswordFor", { name: user.name })}
          </DialogTitle>
          <DialogDescription>
            {saved
              ? t("company.passwordSetLead", { name: user.name })
              : t("company.setPasswordLead")}
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <div className="space-y-3">
            <p
              data-testid="new-password"
              className="rounded-lg bg-muted px-3 py-3 text-center font-mono text-xl font-semibold tracking-wide"
            >
              {password.trim()}
            </p>
            <Button
              variant="outline"
              className="h-11 w-full lg:h-9"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(password.trim())
                  setCopied(true)
                } catch {
                  setCopied(false)
                }
              }}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? t("public.copied") : t("company.copyPassword")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("company.newPassword")}</Label>
            <div className="flex gap-2">
              <Input
                id="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 font-mono text-base lg:h-9 lg:text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="size-11 shrink-0 lg:size-9"
                aria-label={t("company.anotherPassword")}
                onClick={() => setPassword(readablePassword())}
              >
                <RefreshCwIcon />
              </Button>
            </div>
            {tooShort && (
              <p className="text-sm text-destructive">
                {t("validation.passwordMin")}
              </p>
            )}
            <ErrorAlert error={save.error} />
          </div>
        )}

        <DialogFooter>
          {saved ? (
            <Button className="h-11 lg:h-9" onClick={onClose}>
              {t("company.done")}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="h-11 lg:h-9"
                onClick={onClose}
              >
                {t("dash.cancel")}
              </Button>
              <Button
                className="h-11 lg:h-9"
                disabled={tooShort || save.isPending}
                onClick={() =>
                  save.mutate(
                    { id: user.id, password: password.trim() },
                    { onSuccess: () => setSaved(true) },
                  )
                }
              >
                {save.isPending && <Spinner />}
                {t("company.savePassword")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
