import { SearchIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BranchSummary, MemberRole } from "@/lib/api/types"
import { useSession } from "@/stores/session"

export type Role = "admin" | MemberRole

/** Up to this many branches the picker is plain checkboxes; above it, chips and a search */
const FEW = 6

export function RolePicker({
  id,
  value,
  onChange,
}: {
  id: string
  value: Role
  onChange: (r: Role) => void
}) {
  const { t } = useTranslation()
  const isOwner = useSession((s) => s.user?.company_role === "owner")
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)}>
      <SelectTrigger id={id} className="h-11 w-full lg:h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {isOwner && <SelectItem value="admin">{t("roles.admin")}</SelectItem>}
        <SelectItem value="manager">{t("roles.manager")}</SelectItem>
        <SelectItem value="staff">{t("roles.staff")}</SelectItem>
      </SelectContent>
    </Select>
  )
}

/**
 * The branches a manager or staff member works at. A few branches: checkboxes. Many: the chosen
 * ones as chips (tap × to remove) above a search and a short scrolling list, so the choice stays
 * visible however many branches there are.
 */
export function BranchPicker({
  idPrefix,
  branches,
  value,
  onChange,
}: {
  idPrefix: string
  branches: BranchSummary[]
  value: number[]
  onChange: (ids: number[]) => void
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const many = branches.length > FEW
  const toggle = (id: number, on: boolean) =>
    onChange(on ? [...value, id] : value.filter((x) => x !== id))

  const words = search.trim().toLowerCase()
  const listed = branches
    .filter(
      (b) =>
        !words ||
        b.name.toLowerCase().includes(words) ||
        b.address.toLowerCase().includes(words),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
  const chosen = branches.filter((b) => value.includes(b.id))

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 flex w-full items-center justify-between gap-2 text-sm font-medium">
        {t("company.worksAt")}
        {many && (
          <span className="font-normal text-muted-foreground">
            {t("team.chosen", { count: value.length, total: branches.length })}
          </span>
        )}
      </legend>

      {many && (
        <>
          {chosen.length > 0 ? (
            <ul
              aria-label={t("team.chosenBranches")}
              className="flex flex-wrap gap-2"
            >
              {chosen.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => toggle(b.id, false)}
                    aria-label={t("team.removeBranch", { name: b.name })}
                    className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground lg:h-9"
                  >
                    {b.name}
                    <XIcon className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("team.noneChosen")}
            </p>
          )}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label={t("team.findBranch")}
              placeholder={t("team.findBranch")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-9 text-base lg:h-9 lg:text-sm"
            />
          </div>
        </>
      )}

      {/* relative: each checkbox adds a hidden absolutely-positioned input (for forms); without a
          positioned box they escape the scrolling list and stretch the page with empty space */}
      <div
        className={
          many
            ? "relative max-h-64 space-y-1 overflow-y-auto rounded-lg border p-1"
            : "relative grid gap-1 sm:grid-cols-2"
        }
      >
        {listed.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            {t("team.noBranchMatch")}
          </p>
        )}
        {listed.map((b) => {
          const id = `${idPrefix}-${b.id}`
          return (
            <Label
              key={b.id}
              htmlFor={id}
              className={
                many
                  ? "flex min-h-11 items-center gap-3 rounded-md px-3 font-normal hover:bg-muted"
                  : "flex min-h-11 items-center gap-3 rounded-lg border px-3 font-normal"
              }
            >
              <Checkbox
                id={id}
                checked={value.includes(b.id)}
                onCheckedChange={(on) => toggle(b.id, on === true)}
              />
              <span className="min-w-0">
                <span className="block truncate">{b.name}</span>
                {many && b.address && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {b.address}
                  </span>
                )}
              </span>
            </Label>
          )
        })}
      </div>
    </fieldset>
  )
}
