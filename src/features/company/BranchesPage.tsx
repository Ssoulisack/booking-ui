import { CopyIcon, PlusIcon, QrCodeIcon, SearchIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ShareBooking } from "@/features/dashboard/ShareBooking"
import { EmptyState, FormDialog, PageHeader } from "@/features/dashboard/ui"
import type { BranchSummary } from "@/lib/api/types"

import { slugify, useBranches, useCreateBranch, useSetClosed } from "./api"
import { paginate } from "./paging"
import { copyName } from "./clone"
import { Pager, StatusBadge } from "./ui"

/** /company/branches — every branch: open its dashboard, its QR code, close or reopen it, open a new one */
export function BranchesPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  // the dialog: open from "New branch" (no source) or from a row's "Clone" (that branch)
  const [creating, setCreating] = useState<
    { from: BranchSummary | null } | undefined
  >(params.get("new") === "1" ? { from: null } : undefined)
  const branches = useBranches()
  const [page, setPage] = useState(1)
  const q = (params.get("q") ?? "").trim().toLowerCase()
  const found = (branches.data ?? []).filter(
    (b) =>
      !q ||
      [b.name, b.address, b.slug].some((v) => v.toLowerCase().includes(q)),
  )
  const rows = paginate(found, page)

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("nav.branches")}
        lead={t("company.branchesLead")}
        actions={
          <Button
            className="h-11 lg:h-9"
            onClick={() => setCreating({ from: null })}
          >
            <PlusIcon />
            {t("company.newBranch")}
          </Button>
        }
      />
      {branches.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : branches.isError ? (
        <PageError error={branches.error} onRetry={() => branches.refetch()} />
      ) : branches.data.length === 0 ? (
        <EmptyState text={t("company.noBranches")} />
      ) : (
        <>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label={t("company.searchBranches")}
              placeholder={t("company.searchBranchesPlaceholder")}
              value={params.get("q") ?? ""}
              onChange={(e) => {
                const next = new URLSearchParams(params)
                if (e.target.value) next.set("q", e.target.value)
                else next.delete("q")
                setParams(next, { replace: true })
                setPage(1)
              }}
              className="h-11 bg-background pl-9 lg:h-9"
            />
          </div>
          {found.length === 0 && (
            <EmptyState text={t("company.noBranchMatch")} />
          )}
          <ul className="divide-y rounded-xl bg-background ring-1 ring-border empty:hidden">
            {rows.items.map((b) => (
              <BranchRow
                key={b.id}
                branch={b}
                onClone={() => setCreating({ from: b })}
              />
            ))}
          </ul>
          <Pager meta={rows.meta} page={rows.page} onPage={setPage} />
        </>
      )}
      {creating && (
        <NewBranchDialog
          from={creating.from}
          onClose={() => {
            setCreating(undefined)
            if (params.has("new")) setParams({}, { replace: true })
          }}
        />
      )}
    </div>
  )
}

function BranchRow({
  branch: b,
  onClone,
}: {
  branch: BranchSummary
  onClone: () => void
}) {
  const { t } = useTranslation()
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-48 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {b.name}
          <StatusBadge status={b.status} />
        </p>
        <p className="text-sm text-muted-foreground">
          {[b.address, `/b/${b.slug}`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <Button asChild variant="outline" className="h-11 lg:h-9">
        <Link to={`/dashboard/${b.id}`}>{t("company.openBranch")}</Link>
      </Button>
      {b.status === "published" && <QrButton branch={b} />}
      <Button variant="outline" className="h-11 lg:h-9" onClick={onClone}>
        <CopyIcon />
        {t("company.clone")}
      </Button>
      <CloseButton branch={b} />
    </li>
  )
}

/** The live branch's booking link: QR code, share, download, print */
function QrButton({ branch: b }: { branch: BranchSummary }) {
  const { t } = useTranslation()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 lg:h-9">
          <QrCodeIcon />
          {t("company.qr")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{b.name}</DialogTitle>
          <DialogDescription>{t("company.qrLead")}</DialogDescription>
        </DialogHeader>
        <ShareBooking
          url={`${window.location.origin}${b.public_path}`}
          name={b.name}
        />
      </DialogContent>
    </Dialog>
  )
}

function CloseButton({ branch: b }: { branch: BranchSummary }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const change = useSetClosed()
  const closed = b.status === "closed"
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="h-11 lg:h-9">
          {closed ? t("company.reopen") : t("company.close")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {closed
              ? t("company.reopenTitle", { name: b.name })
              : t("company.closeTitle", { name: b.name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {closed ? t("company.reopenLead") : t("company.closeLead")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorAlert error={change.error} />
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 lg:h-9">
            {t("dash.cancel")}
          </AlertDialogCancel>
          <Button
            variant={closed ? "default" : "destructive"}
            className="h-11 lg:h-9"
            disabled={change.isPending}
            onClick={() =>
              change.mutate(
                { id: b.id, closed: !closed },
                {
                  onSuccess: () => {
                    setOpen(false)
                    toast.success(
                      closed ? t("company.reopened") : t("company.closed"),
                    )
                  },
                },
              )
            }
          >
            {change.isPending && <Spinner />}
            {closed ? t("company.reopen") : t("company.close")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * A new branch starts as a draft; its dashboard opens to set it up. It can start as a copy of
 * another branch's setup ("Start from a branch", or the row's Clone button).
 */
function NewBranchDialog({
  from,
  onClose,
}: {
  from: BranchSummary | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const create = useCreateBranch()
  const branches = useBranches().data ?? []
  const [source, setSource] = useState(from?.id ?? 0)
  const [name, setName] = useState(() =>
    from ? copyName(from.name, branches) : "",
  )
  const [slug, setSlug] = useState(() =>
    from ? slugify(copyName(from.name, branches)) : "",
  )
  const [nameTouched, setNameTouched] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  // choosing a branch to copy suggests the copy's name, until the person types their own
  const choose = (id: number) => {
    setSource(id)
    if (nameTouched) return
    const src = branches.find((b) => b.id === id)
    const next = src ? copyName(src.name, branches) : ""
    setName(next)
    if (!slugTouched) setSlug(slugify(next))
  }

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={
        from
          ? t("company.cloneTitle", { name: from.name })
          : t("company.newBranch")
      }
      description={from ? t("company.cloneLead") : t("company.newBranchLead")}
      submitLabel={
        source ? t("company.cloneSubmit") : t("company.createBranch")
      }
      pending={create.isPending}
      error={create.error}
      onSubmit={(e) => {
        e.preventDefault()
        create.mutate(
          {
            name: name.trim(),
            slug: slug.trim(),
            ...(source ? { clone_from: source } : {}),
          },
          {
            onSuccess: (b) => {
              toast.success(
                t(source ? "company.branchCloned" : "company.branchCreated", {
                  name: b.name,
                }),
              )
              onClose()
              navigate(`/dashboard/${b.id}`)
            },
          },
        )
      }}
    >
      {!from && branches.length > 0 && (
        <Field>
          <FieldLabel htmlFor="branch-template">
            {t("company.template")}
          </FieldLabel>
          {/* native picker: the phone's own list, and typing jumps to a branch */}
          <select
            id="branch-template"
            value={source}
            onChange={(e) => choose(Number(e.target.value))}
            className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-base lg:h-9 lg:text-sm"
          >
            <option value={0}>{t("company.templateNone")}</option>
            {[...branches]
              .sort((x, y) => x.name.localeCompare(y.name))
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </Field>
      )}
      {source > 0 && (
        <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          {t("company.cloneCopies")}
        </p>
      )}
      <Field>
        <FieldLabel htmlFor="branch-name">{t("company.branchName")}</FieldLabel>
        <Input
          id="branch-name"
          value={name}
          onChange={(e) => {
            setNameTouched(true)
            setName(e.target.value)
            if (!slugTouched) setSlug(slugify(e.target.value))
          }}
          className="h-11 text-base lg:h-9 lg:text-sm"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="branch-slug">{t("settings.address")}</FieldLabel>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">/b/</span>
          <Input
            id="branch-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }}
            className="h-11 text-base lg:h-9 lg:text-sm"
          />
        </div>
        <FieldDescription>{t("company.linkHint")}</FieldDescription>
      </Field>
    </FormDialog>
  )
}
