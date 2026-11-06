import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { PageError } from "@/components/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { PackageInput, PackageItem } from "@/lib/api/types"
import { coversLabel, optionLabel } from "@/lib/packages"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useChange, useDelete, useResourcesList, useSportsList } from "../api"
import {
  ActiveSwitch,
  DeleteButton,
  EmptyState,
  FormDialog,
  PageHeader,
} from "../ui"
import { PayInfoPanel } from "../setup/PayInfoPanel"
import { packageApi, usePackages } from "./api"

const input = "h-11 text-base lg:h-9 lg:text-sm"
const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-2.5 text-base lg:h-9 lg:text-sm"

/** /setup/packages — what the branch sells as passes (10 / 20 times, 1 / 3 months), and how customers pay */
export function PackagesPage() {
  const { t } = useTranslation()
  const packages = usePackages()
  const [editing, setEditing] = useState<PackageItem | "new" | null>(null)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("packages.title")}
        lead={t("packages.lead")}
        actions={
          <Button className="h-11 lg:h-9" onClick={() => setEditing("new")}>
            <PlusIcon />
            {t("packages.new")}
          </Button>
        }
      />
      {packages.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : packages.isError ? (
        <PageError error={packages.error} onRetry={() => packages.refetch()} />
      ) : packages.data.length === 0 ? (
        <EmptyState
          text={t("packages.empty")}
          action={
            <Button className="h-11 lg:h-9" onClick={() => setEditing("new")}>
              <PlusIcon />
              {t("packages.new")}
            </Button>
          }
        />
      ) : (
        // one row per option, grouped by package; a phone scrolls the table sideways inside its box
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b text-left whitespace-nowrap text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.colPackage")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.covers")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.colOption")}
                </th>
                <th className="py-2 pr-3 text-right font-medium">
                  {t("packages.price")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.validFor")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("packages.onSale")}
                </th>
                <th className="py-2 font-medium">
                  <span className="sr-only">{t("packages.colActions")}</span>
                </th>
              </tr>
            </thead>
            {packages.data.map((p) => (
              <tbody key={p.id} className="divide-y border-b">
                {p.options.map((o, i) => (
                  <tr
                    key={o.id}
                    className={cn("align-top", i > 0 && "border-t-0")}
                  >
                    {i === 0 && (
                      <>
                        <td
                          rowSpan={p.options.length}
                          className="border-r py-3 pr-3"
                        >
                          <span className="block font-semibold">{p.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {p.sport_name}
                          </span>
                          {!p.active && (
                            <Badge variant="secondary" className="mt-1">
                              {t("packages.hidden")}
                            </Badge>
                          )}
                        </td>
                        <td
                          rowSpan={p.options.length}
                          className="border-r py-3 pr-3 whitespace-nowrap"
                        >
                          {coversLabel(t, p)}
                        </td>
                      </>
                    )}
                    <td className="py-2.5 pr-3 pl-3 whitespace-nowrap">
                      {optionLabel(t, o)}
                    </td>
                    <td className="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums">
                      {money(o.price, p.currency)}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">
                      {o.kind === "times" && o.valid_days > 0
                        ? t("packages.daysN", { count: o.valid_days })
                        : "-"}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {o.active && p.active
                        ? t("packages.yes")
                        : t("packages.no")}
                    </td>
                    {i === 0 && (
                      <td
                        rowSpan={p.options.length}
                        className="py-3 pl-3 text-right"
                      >
                        <Button
                          variant="outline"
                          className="h-11 lg:h-9"
                          onClick={() => setEditing(p)}
                        >
                          <PencilIcon />
                          {t("dash.edit")}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
      <PayInfoPanel />
      {editing && (
        <PackageDialog
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

interface OptionRow {
  id?: number
  kind: "times" | "months"
  amount: string
  price: string
  valid_days: string
  active: boolean
}

function toRow(o: PackageItem["options"][number]): OptionRow {
  return {
    id: o.id,
    kind: o.kind,
    amount: String(o.amount),
    price: String(o.price),
    valid_days: o.valid_days ? String(o.valid_days) : "",
    active: o.active,
  }
}

const digits = (v: string) => v.replace(/[^\d]/g, "")

/** Add or change a package: its name, what it covers and its options (each with its price) */
function PackageDialog({
  item,
  onClose,
}: {
  item: PackageItem | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const sports = (useSportsList().data ?? []).filter(
    (s) => s.active || s.id === item?.sport_id,
  )
  const spaces = useResourcesList().data ?? []
  const save = useChange(packageApi.save, ["packages"])
  const remove = useDelete(packageApi.remove, onClose)
  const [name, setName] = useState(item?.name ?? "")
  const [description, setDescription] = useState(item?.description ?? "")
  const [sportId, setSportId] = useState<number>(
    item?.sport_id ?? sports[0]?.id ?? 0,
  )
  const [covers, setCovers] = useState<"group_class" | "space">(
    item?.covers ?? "group_class",
  )
  const [spaceId, setSpaceId] = useState<number | null>(
    item?.resource_id ?? null,
  )
  const [active, setActive] = useState(item?.active ?? true)
  const [rows, setRows] = useState<OptionRow[]>(
    item?.options.map(toRow) ?? [
      {
        kind: "times",
        amount: "10",
        price: "",
        valid_days: "60",
        active: true,
      },
    ],
  )
  const [deleting, setDeleting] = useState(false)
  const [missing, setMissing] = useState(false)

  const sid = sportId || sports[0]?.id || 0
  const sportSpaces = spaces.filter((s) => s.sport_id === sid && s.active)
  const space =
    covers === "space"
      ? (sportSpaces.find((s) => s.id === spaceId) ?? sportSpaces[0])
      : undefined

  const setRow = (i: number, patch: Partial<OptionRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const valid =
    name.trim() &&
    sid &&
    (covers === "group_class" || space) &&
    rows.length > 0 &&
    rows.every((r) => Number(r.amount) >= 1 && Number(r.price) >= 1)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) {
      setMissing(true)
      return
    }
    const body: PackageInput & { id?: number } = {
      id: item?.id,
      sport_id: sid,
      name: name.trim(),
      description: description.trim(),
      covers,
      resource_id: space?.id ?? null,
      active,
      options: rows.map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        kind: r.kind,
        amount: Number(r.amount),
        price: Number(r.price),
        valid_days: r.kind === "times" ? Number(r.valid_days) || 0 : 0,
        active: r.active,
      })),
    }
    save.mutate(body, {
      onSuccess: () => {
        toast.success(t("packages.saved"))
        onClose()
      },
    })
  }

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={item ? t("packages.edit") : t("packages.new")}
      submitLabel={t("dash.save")}
      pending={save.isPending}
      error={save.error}
      onSubmit={submit}
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="pk-name">{t("packages.name")}</Label>
          <Input
            id="pk-name"
            value={name}
            maxLength={120}
            aria-invalid={(missing && !name.trim()) || undefined}
            placeholder={t("packages.namePlaceholder")}
            onChange={(e) => setName(e.target.value)}
            className={input}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pk-sport">{t("packages.sport")}</Label>
          <select
            id="pk-sport"
            value={sid}
            onChange={(e) => setSportId(Number(e.target.value))}
            className={selectClass}
          >
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            {t("packages.covers")}
          </legend>
          {(["group_class", "space"] as const).map((c) => (
            <label
              key={c}
              className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary"
            >
              <input
                type="radio"
                name="pk-covers"
                checked={covers === c}
                onChange={() => setCovers(c)}
                className="mt-1 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">
                  {t(`packages.coversOptions.${c}`)}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {t(`packages.coversHints.${c}`)}
                </span>
              </span>
            </label>
          ))}
          {covers === "space" &&
            (sportSpaces.length === 0 ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t("packages.noSpaces")}
              </p>
            ) : (
              <select
                aria-label={t("packages.space")}
                value={space?.id ?? ""}
                onChange={(e) => setSpaceId(Number(e.target.value))}
                className={selectClass}
              >
                {sportSpaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ))}
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor="pk-desc">{t("packages.description")}</Label>
          <Textarea
            id="pk-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">
            {t("packages.options")}
          </legend>
          <p className="text-sm text-muted-foreground">
            {t("packages.optionsHint")}
          </p>
          {rows.map((r, i) => (
            <div
              key={r.id ?? `new-${i}`}
              className="space-y-3 rounded-lg border p-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`pk-kind-${i}`}>{t("packages.kind")}</Label>
                  <select
                    id={`pk-kind-${i}`}
                    value={r.kind}
                    onChange={(e) =>
                      setRow(i, { kind: e.target.value as OptionRow["kind"] })
                    }
                    className={selectClass}
                  >
                    <option value="times">{t("packages.kinds.times")}</option>
                    <option value="months">{t("packages.kinds.months")}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`pk-amount-${i}`}>
                    {r.kind === "times"
                      ? t("packages.howManyTimes")
                      : t("packages.howManyMonths")}
                  </Label>
                  <Input
                    id={`pk-amount-${i}`}
                    inputMode="numeric"
                    value={r.amount}
                    aria-invalid={
                      (missing && Number(r.amount) < 1) || undefined
                    }
                    onChange={(e) =>
                      setRow(i, { amount: digits(e.target.value) })
                    }
                    className={input}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`pk-price-${i}`}>{t("packages.price")}</Label>
                  <Input
                    id={`pk-price-${i}`}
                    inputMode="numeric"
                    value={r.price}
                    aria-invalid={(missing && Number(r.price) < 1) || undefined}
                    onChange={(e) =>
                      setRow(i, { price: digits(e.target.value) })
                    }
                    className={input}
                  />
                </div>
                {r.kind === "times" && (
                  <div className="space-y-1.5">
                    <Label htmlFor={`pk-days-${i}`}>
                      {t("packages.validFor")}
                    </Label>
                    <Input
                      id={`pk-days-${i}`}
                      inputMode="numeric"
                      value={r.valid_days}
                      placeholder={t("packages.noExpiry")}
                      onChange={(e) =>
                        setRow(i, { valid_days: digits(e.target.value) })
                      }
                      className={input}
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ActiveSwitch
                  id={`pk-active-${i}`}
                  checked={r.active}
                  onChange={(v) => setRow(i, { active: v })}
                  label={t("packages.optionOnSale")}
                />
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 text-destructive lg:h-9"
                    onClick={() =>
                      setRows((rs) => rs.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2Icon />
                    {t("packages.removeOption")}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {rows.length < 12 && (
            <Button
              type="button"
              variant="outline"
              className="h-11 lg:h-9"
              onClick={() =>
                setRows((rs) => [
                  ...rs,
                  {
                    kind: "times",
                    amount: "",
                    price: "",
                    valid_days: "",
                    active: true,
                  },
                ])
              }
            >
              <PlusIcon />
              {t("packages.addOption")}
            </Button>
          )}
        </fieldset>

        <ActiveSwitch
          id="pk-on"
          checked={active}
          onChange={setActive}
          label={t("packages.onSale")}
          hint={t("packages.onSaleHint")}
        />
        {item && (
          <DeleteButton
            what={item.name}
            open={deleting}
            onOpenChange={setDeleting}
            pending={remove.isPending}
            error={remove.error}
            onConfirm={() => remove.mutate(item.id)}
            title={t("packages.deleteTitle")}
            description={t("packages.deleteHint")}
          />
        )}
      </div>
    </FormDialog>
  )
}
