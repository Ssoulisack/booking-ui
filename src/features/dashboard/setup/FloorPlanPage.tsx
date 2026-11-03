import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangleIcon,
  CircleDotIcon,
  DoorOpenIcon,
  FootprintsIcon,
  LayersIcon,
  MartiniIcon,
  MicVocalIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  RotateCwIcon,
  SquareDashedIcon,
  ToiletIcon,
  Trash2Icon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useRef, useState, type PointerEvent } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { PageError } from "@/components/page-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type {
  FloorItem,
  FloorItemKind,
  ManagedSport,
  ManagedTable,
  TableShape,
  ZoneColor,
} from "@/lib/api/types"
import { cn } from "@/lib/utils"
import {
  blocks,
  FLOOR_ITEM_KINDS,
  FLOORS,
  floorName,
  footprint,
  inside,
  ITEM_SIZES,
  overlaps,
} from "@/lib/floor-plan"
import { useUnsaved } from "@/stores/unsaved"

import {
  manage,
  useBiz,
  useChange,
  useDelete,
  useFloorPlan,
  useSportsList,
} from "../api"
import {
  ActiveSwitch,
  DeleteButton,
  EmptyState,
  FormDialog,
  PageHeader,
  Panel,
} from "../ui"

const SHAPES: TableShape[] = ["square", "round", "long"]
const MAX_TABLE_SIZE = 12

/**
 * /setup/floor-plan — a restaurant's areas (Indoor, Terrace…) and their 2D floor plans: drag the
 * tables where they stand, set their seats, shape and size. Moves are kept until Save.
 */
export function FloorPlanPage() {
  const { t } = useTranslation()
  const areas = useSportsList()
  const [params, setParams] = useSearchParams()
  const [dialog, setDialog] = useState<ManagedSport | "new" | null>(null)
  if (areas.isPending) return <Skeleton className="h-96 rounded-xl" />
  if (areas.isError)
    return <PageError error={areas.error} onRetry={() => areas.refetch()} />

  // areas lowest floor first; the floor tabs show only when the place has more than one floor
  const list = [...areas.data].sort((a, b) => (a.floor ?? 0) - (b.floor ?? 0))
  const chosen = Number(params.get("area"))
  const area = list.find((a) => a.id === chosen) ?? list[0]
  const floors = [...new Set(list.map((a) => a.floor ?? 0))]
  const floor = area?.floor ?? 0
  const onFloor = list.filter((a) => (a.floor ?? 0) === floor)
  const choose = (id: number) =>
    setParams((p) => {
      p.set("area", String(id))
      return p
    })
  const goFloor = (f: number) => {
    const first = list.find((a) => (a.floor ?? 0) === f)
    if (first) choose(first.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("restaurant.plan.title")}
        lead={t("restaurant.plan.lead")}
        actions={
          <Button
            variant="outline"
            className="h-11 lg:h-9"
            onClick={() => setDialog("new")}
          >
            <PlusIcon />
            {t("restaurant.area.add")}
          </Button>
        }
      />
      {list.length === 0 ? (
        <EmptyState
          text={t("restaurant.area.empty")}
          action={
            <Button className="h-11 lg:h-9" onClick={() => setDialog("new")}>
              <PlusIcon />
              {t("restaurant.area.add")}
            </Button>
          }
        />
      ) : (
        <>
          {floors.length > 1 && (
            <div
              role="tablist"
              aria-label={t("restaurant.floors.floors")}
              className="-mb-2 no-scrollbar flex gap-1 overflow-x-auto border-b"
            >
              {floors.map((f) => (
                <button
                  key={f}
                  role="tab"
                  type="button"
                  aria-selected={f === floor}
                  onClick={() => goFloor(f)}
                  className={cn(
                    "flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium",
                    f === floor
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayersIcon className="size-4" />
                  {floorName(t, f)}
                </button>
              ))}
            </div>
          )}
          <div
            role="tablist"
            aria-label={t("restaurant.area.areas")}
            className="no-scrollbar flex gap-2 overflow-x-auto"
          >
            {onFloor.map((a) => (
              <button
                key={a.id}
                role="tab"
                type="button"
                aria-selected={a.id === area.id}
                onClick={() => choose(a.id)}
                className={cn(
                  "h-11 shrink-0 rounded-full px-4 text-sm font-medium ring-1 ring-border lg:h-9",
                  a.id === area.id
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-background hover:bg-muted",
                  !a.active && "opacity-60",
                )}
              >
                {a.name}
              </button>
            ))}
          </div>
          <PlanEditor
            key={area.id}
            area={area}
            floors={floors}
            onGoFloor={goFloor}
            onEditArea={() => setDialog(area)}
          />
        </>
      )}
      {dialog && (
        <AreaDialog
          area={dialog === "new" ? null : dialog}
          defaultFloor={floor}
          onClose={() => setDialog(null)}
          onSaved={(id) => choose(id)}
        />
      )}
    </div>
  )
}

/** Add or edit an area: its name, plan size and whether it can be booked */
function AreaDialog({
  area,
  defaultFloor,
  onClose,
  onSaved,
}: {
  area: ManagedSport | null
  defaultFloor: number
  onClose: () => void
  onSaved: (id: number) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(area?.name ?? "")
  const [floor, setFloor] = useState(area ? (area.floor ?? 0) : defaultFloor)
  const [width, setWidth] = useState(area?.plan_width || 20)
  const [height, setHeight] = useState(area?.plan_height || 12)
  const [active, setActive] = useState(area?.active ?? true)
  const save = useChange(manage.saveSport, ["sports", "plan"])
  const [deleting, setDeleting] = useState(false)
  const remove = useDelete(manage.deleteSport, onClose)

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={area ? t("restaurant.area.edit") : t("restaurant.area.add")}
      description={t("restaurant.area.lead")}
      submitLabel={t("dash.save")}
      pending={save.isPending}
      error={save.error}
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate(
          {
            id: area?.id,
            name: name.trim(),
            description: area?.description ?? "",
            image_key: area?.image_key ?? "",
            active,
            type: "other",
            plan_width: width,
            plan_height: height,
            floor,
          },
          {
            onSuccess: (a) => {
              toast.success(t("restaurant.area.saved", { name: a.name }))
              onSaved(a.id)
              onClose()
            },
          },
        )
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="area-name">{t("setup.name")}</Label>
        <Input
          id="area-name"
          value={name}
          placeholder={t("restaurant.area.namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
          className="h-11 text-base lg:h-9 lg:text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="area-floor">{t("restaurant.floors.which")}</Label>
        {/* native picker: the phone's own list */}
        <select
          id="area-floor"
          value={floor}
          onChange={(e) => setFloor(Number(e.target.value))}
          className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-base lg:h-9 lg:text-sm"
        >
          {[...FLOORS].reverse().map((f) => (
            <option key={f} value={f}>
              {floorName(t, f)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("restaurant.area.size")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <NumberBox
            id="area-w"
            label={t("restaurant.area.width")}
            value={width}
            onChange={setWidth}
          />
          <span aria-hidden className="text-muted-foreground">
            ×
          </span>
          <NumberBox
            id="area-h"
            label={t("restaurant.area.height")}
            value={height}
            onChange={setHeight}
          />
          <span className="text-sm text-muted-foreground">
            {t("restaurant.area.squares")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("restaurant.area.sizeHint")}
        </p>
      </div>
      <ActiveSwitch
        id="area-active"
        label={t("setup.bookable")}
        hint={t("restaurant.area.activeHint")}
        checked={active}
        onChange={setActive}
      />
      {area && (
        <div className="border-t pt-4">
          <DeleteButton
            what={area.name}
            label={t("restaurant.area.delete")}
            open={deleting}
            onOpenChange={setDeleting}
            pending={remove.isPending}
            error={remove.error}
            onConfirm={() => remove.mutate(area.id)}
          />
        </div>
      )}
    </FormDialog>
  )
}

function NumberBox({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <Input
      id={id}
      aria-label={label}
      type="number"
      inputMode="numeric"
      min={1}
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      className="h-11 w-20 text-base lg:h-9 lg:text-sm"
    />
  )
}

/** The plan of one area: the grid, its tables and objects (drag to move), and the selected one's details */
function PlanEditor({
  area,
  floors,
  onGoFloor,
  onEditArea,
}: {
  area: ManagedSport
  floors: number[]
  onGoFloor: (floor: number) => void
  onEditArea: () => void
}) {
  const plan = useFloorPlan(area.id)
  if (plan.isPending) return <Skeleton className="h-96 rounded-xl" />
  if (plan.isError)
    return <PageError error={plan.error} onRetry={() => plan.refetch()} />
  return (
    <Editor
      key={plan.dataUpdatedAt}
      area={plan.data.area}
      initial={plan.data.tables}
      initialItems={plan.data.items ?? []}
      floors={floors}
      onGoFloor={onGoFloor}
      onEditArea={onEditArea}
    />
  )
}

/** What is selected on the plan: a table or an object */
type Pick_ = { type: "table" | "item"; id: number } | null

// new objects get negative ids until they are saved
let nextNewId = -1

function Editor({
  area,
  initial,
  initialItems,
  floors,
  onGoFloor,
  onEditArea,
}: {
  area: ManagedSport
  initial: ManagedTable[]
  initialItems: FloorItem[]
  floors: number[]
  onGoFloor: (floor: number) => void
  onEditArea: () => void
}) {
  const { t } = useTranslation()
  const { base, key } = useBiz()
  const queryClient = useQueryClient()
  const [tables, setTables] = useState(initial)
  const [items, setItems] = useState(initialItems)
  const [picked, setPicked] = useState<Pick_>(
    initial[0] ? { type: "table", id: initial[0].id } : null,
  )
  const [adding, setAdding] = useState(false)
  const W = area.plan_width
  const H = area.plan_height
  const dirty =
    JSON.stringify(tables) !== JSON.stringify(initial) ||
    JSON.stringify(items) !== JSON.stringify(initialItems)
  useUnsaved(dirty)

  const selectedTable =
    picked?.type === "table"
      ? (tables.find((x) => x.id === picked.id) ?? null)
      : null
  const selectedItem =
    picked?.type === "item"
      ? (items.find((x) => x.id === picked.id) ?? null)
      : null
  const blockers = items.filter(blocks)
  const clashing = new Set(
    tables.flatMap((a, i) => [
      ...tables
        .slice(i + 1)
        .flatMap((b) => (overlaps(a, b) ? [a.id, b.id] : [])),
      ...(blockers.some((o) => overlaps(a, o)) ? [a.id] : []),
    ]),
  )
  const outside = new Set(
    tables.filter((x) => !inside(x, W, H)).map((x) => x.id),
  )
  const itemsOutside = new Set(
    items.filter((x) => !inside(x, W, H)).map((x) => x.id),
  )
  const problems = clashing.size + outside.size + itemsOutside.size > 0
  const update = (id: number, patch: Partial<ManagedTable>) =>
    setTables((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const updateItem = (id: number, patch: Partial<FloorItem>) =>
    setItems((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const addItem = (kind: FloorItemKind) => {
    const [w, h] = ITEM_SIZES[kind]
    const item: FloorItem = {
      id: nextNewId--,
      kind,
      label: t(`restaurant.items.default.${kind}`),
      color: kind === "zone" ? "green" : "",
      plan_x: 0,
      plan_y: 0,
      plan_w: Math.min(w, W),
      plan_h: Math.min(h, H),
      rotation: 0,
      // stairs lead to the next floor up (or down from the top floor)
      target_floor:
        kind === "stairs"
          ? (floors.find((f) => f > (area.floor ?? 0)) ??
            floors.findLast((f) => f < (area.floor ?? 0)) ??
            (area.floor ?? 0) + 1)
          : null,
    }
    setItems((list) => [...list, item])
    setPicked({ type: "item", id: item.id })
  }

  // one Save: every table's place and every object (checked together), then the tables whose details changed
  const save = useMutation({
    mutationFn: async () => {
      await manage.saveFloorPlan(base, {
        areaId: area.id,
        plan_width: W,
        plan_height: H,
        tables: tables.map((x) => ({
          id: x.id,
          plan_x: x.plan_x,
          plan_y: x.plan_y,
          plan_w: x.plan_w,
          plan_h: x.plan_h,
          rotation: x.rotation,
          shape: x.shape,
        })),
        items,
      })
      for (const x of tables) {
        const was = initial.find((i) => i.id === x.id)
        if (
          was &&
          (was.name !== x.name ||
            was.seats !== x.seats ||
            was.extra_chairs !== x.extra_chairs ||
            was.active !== x.active)
        ) {
          await manage.saveResource(base, { ...x, kind: "table" })
        }
      }
    },
    onSuccess: () => {
      toast.success(t("restaurant.plan.saved"))
      void queryClient.invalidateQueries({ queryKey: key("plan", area.id) })
      void queryClient.invalidateQueries({ queryKey: key("resources") })
      void queryClient.invalidateQueries({ queryKey: ["public"] })
    },
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {t("restaurant.plan.areaInfo", {
              w: W,
              h: H,
              count: tables.length,
              seats: tables.reduce((n, x) => n + (x.active ? x.seats : 0), 0),
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              className="h-11 lg:h-9"
              disabled={dirty}
              onClick={onEditArea}
            >
              <PencilIcon />
              {t("restaurant.area.edit")}
            </Button>
            <AddItemMenu onAdd={addItem} />
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              disabled={dirty}
              onClick={() => setAdding(true)}
            >
              <PlusIcon />
              {t("restaurant.table.add")}
            </Button>
          </div>
        </div>
        {dirty && (
          <p className="text-sm text-muted-foreground">
            {t("restaurant.plan.saveFirst")}
          </p>
        )}
        <Canvas
          width={W}
          height={H}
          tables={tables}
          items={items}
          picked={picked}
          bad={(type, id) =>
            type === "table"
              ? clashing.has(id) || outside.has(id)
              : itemsOutside.has(id)
          }
          onPick={setPicked}
          onMove={(type, id, x, y) =>
            type === "table"
              ? update(id, { plan_x: x, plan_y: y })
              : updateItem(id, { plan_x: x, plan_y: y })
          }
          onResize={(type, id, w, h) =>
            type === "table"
              ? update(id, { plan_w: w, plan_h: h })
              : updateItem(id, { plan_w: w, plan_h: h })
          }
        />
        {problems && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangleIcon className="size-4 shrink-0" />
            {t("restaurant.plan.problems")}
          </p>
        )}
      </div>

      {/* phone: the selected table's panel and Save come right under the plan, the list after them */}
      <div className="space-y-4 lg:sticky lg:top-20 lg:row-span-2 lg:self-start">
        {selectedTable ? (
          <TablePanel
            key={`t${selectedTable.id}`}
            table={selectedTable}
            onChange={(patch) => update(selectedTable.id, patch)}
            onDeleted={() => {
              setPicked(null)
              void queryClient.invalidateQueries({
                queryKey: key("plan", area.id),
              })
            }}
            canDelete={!dirty}
          />
        ) : selectedItem ? (
          <ItemPanel
            key={`i${selectedItem.id}`}
            item={selectedItem}
            areaFloor={area.floor ?? 0}
            canLeave={!dirty}
            onGoFloor={onGoFloor}
            maxW={W}
            maxH={H}
            onChange={(patch) => updateItem(selectedItem.id, patch)}
            onRemove={() => {
              setItems((list) => list.filter((x) => x.id !== selectedItem.id))
              setPicked(null)
            }}
          />
        ) : (
          <Panel>
            <p className="text-sm text-muted-foreground">
              {tables.length === 0
                ? t("restaurant.table.none")
                : t("restaurant.table.pick")}
            </p>
          </Panel>
        )}
        <div className="space-y-3">
          <ErrorAlert error={save.error} />
          <Button
            className="h-11 w-full lg:h-9"
            disabled={!dirty || problems || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Spinner />}
            {t("restaurant.plan.save")}
          </Button>
          {dirty && (
            <Button
              variant="ghost"
              className="h-11 w-full lg:h-9"
              disabled={save.isPending}
              onClick={() => {
                setTables(initial)
                setItems(initialItems)
              }}
            >
              {t("restaurant.plan.undo")}
            </Button>
          )}
        </div>
      </div>

      <div className="min-w-0 lg:col-start-1">
        <TableList
          tables={tables}
          selectedId={picked?.type === "table" ? picked.id : null}
          onSelect={(id) => setPicked({ type: "table", id })}
        />
      </div>

      {adding && (
        <AddTableDialog
          area={area}
          count={tables.length}
          onClose={() => setAdding(false)}
          onAdded={(id) => setPicked({ type: "table", id })}
        />
      )}
    </div>
  )
}

const ITEM_ICONS: Record<FloorItemKind, LucideIcon> = {
  bar: MartiniIcon,
  pole: CircleDotIcon,
  stage: MicVocalIcon,
  toilet: ToiletIcon,
  entry: DoorOpenIcon,
  label: TypeIcon,
  zone: SquareDashedIcon,
  stairs: FootprintsIcon,
}

/** Zone colours: a light fill behind the tables, a darker border and name */
const ZONE_STYLES: Record<ZoneColor, string> = {
  green: "bg-emerald-500/15 border-emerald-600/50 text-emerald-900",
  blue: "bg-sky-500/15 border-sky-600/50 text-sky-900",
  amber: "bg-amber-400/20 border-amber-600/50 text-amber-900",
  rose: "bg-rose-500/15 border-rose-600/50 text-rose-900",
  violet: "bg-violet-500/15 border-violet-600/50 text-violet-900",
  slate: "bg-slate-500/15 border-slate-600/50 text-slate-900",
}
const ZONE_COLORS = Object.keys(ZONE_STYLES) as ZoneColor[]

/** How each object looks on the plan */
function itemLook(item: FloorItem) {
  switch (item.kind) {
    case "zone":
      return cn(
        "border-2 border-dashed items-start justify-start p-1",
        ZONE_STYLES[(item.color || "green") as ZoneColor],
      )
    case "bar":
      return "rounded-md bg-stone-700 text-white border-stone-800"
    case "pole":
      return "rounded-full bg-stone-500 text-white border-stone-600"
    case "stage":
      return "rounded-md bg-violet-200 text-violet-950 border-violet-400"
    case "toilet":
      return "rounded-md bg-sky-100 text-sky-950 border-sky-300"
    case "entry":
      return "rounded-md border-dashed border-foreground/40 bg-background/70"
    case "label":
      return "border-transparent bg-transparent"
    case "stairs":
      // steps: light and dark stripes across the stairs
      return "rounded-sm border-stone-500 text-stone-900 bg-[repeating-linear-gradient(0deg,var(--color-stone-200)_0_6px,var(--color-stone-400)_6px_8px)]"
  }
}

/** Add a bar, pole, stage, toilet, entrance, text or zone; it starts in the top-left corner */
function AddItemMenu({ onAdd }: { onAdd: (kind: FloorItemKind) => void }) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-11 lg:h-9">
          <PlusIcon />
          {t("restaurant.items.add")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {FLOOR_ITEM_KINDS.map((kind) => {
          const Icon = ITEM_ICONS[kind]
          return (
            <DropdownMenuItem
              key={kind}
              className="min-h-11 lg:min-h-9"
              onSelect={() => onAdd(kind)}
            >
              <Icon />
              {t(`restaurant.items.kinds.${kind}`)}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The selected object: its text, zone colour, size and turn; kept until Save */
function ItemPanel({
  item,
  areaFloor,
  canLeave,
  onGoFloor,
  maxW,
  maxH,
  onChange,
  onRemove,
}: {
  item: FloorItem
  areaFloor: number
  canLeave: boolean
  onGoFloor: (floor: number) => void
  maxW: number
  maxH: number
  onChange: (patch: Partial<FloorItem>) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  return (
    <Panel
      title={t(`restaurant.items.kinds.${item.kind}`)}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="size-11 text-muted-foreground lg:size-9"
          aria-label={t("restaurant.items.remove")}
          onClick={onRemove}
        >
          <Trash2Icon />
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="item-label">{t("restaurant.items.text")}</Label>
          <Input
            id="item-label"
            value={item.label}
            maxLength={40}
            onChange={(e) => onChange({ label: e.target.value })}
            className="h-11 text-base lg:h-9 lg:text-sm"
          />
        </div>
        {item.kind === "stairs" && (
          <div className="space-y-1.5">
            <Label htmlFor="item-floor">{t("restaurant.floors.leadsTo")}</Label>
            <select
              id="item-floor"
              value={item.target_floor ?? ""}
              onChange={(e) =>
                onChange({
                  target_floor:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-base lg:h-9 lg:text-sm"
            >
              <option value="">{t("restaurant.floors.notSet")}</option>
              {[...FLOORS]
                .reverse()
                .filter((f) => f !== areaFloor)
                .map((f) => (
                  <option key={f} value={f}>
                    {floorName(t, f)}
                  </option>
                ))}
            </select>
            {item.target_floor !== null && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full lg:h-9"
                disabled={!canLeave}
                onClick={() => onGoFloor(item.target_floor!)}
              >
                <LayersIcon />
                {t("restaurant.floors.open", {
                  floor: floorName(t, item.target_floor),
                })}
              </Button>
            )}
            {!canLeave && item.target_floor !== null && (
              <p className="text-sm text-muted-foreground">
                {t("restaurant.floors.saveFirst")}
              </p>
            )}
          </div>
        )}
        {item.kind === "zone" && (
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">
              {t("restaurant.items.color")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {ZONE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={t(`restaurant.items.colors.${color}`)}
                  aria-pressed={item.color === color}
                  onClick={() => onChange({ color })}
                  className={cn(
                    "size-11 rounded-full border-2 lg:size-9",
                    ZONE_STYLES[color],
                    item.color === color && "ring-2 ring-primary ring-offset-2",
                  )}
                />
              ))}
            </div>
          </fieldset>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Stepper
            label={t("restaurant.table.width")}
            value={item.plan_w}
            min={1}
            max={maxW}
            onChange={(plan_w) => onChange({ plan_w })}
          />
          <Stepper
            label={t("restaurant.table.depth")}
            value={item.plan_h}
            min={1}
            max={maxH}
            onChange={(plan_h) => onChange({ plan_h })}
          />
        </div>
        {item.kind !== "zone" && (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full lg:h-9"
            onClick={() =>
              onChange({
                rotation: ((item.rotation + 90) % 360) as FloorItem["rotation"],
              })
            }
          >
            <RotateCwIcon />
            {t("restaurant.table.turn")}
          </Button>
        )}
        <p className="text-sm text-muted-foreground">
          {blocks(item)
            ? t("restaurant.items.blocksHint")
            : t("restaurant.items.freeHint")}
        </p>
      </div>
    </Panel>
  )
}

/**
 * The grid with the zones (behind), the tables and the objects; each is dragged with a finger
 * or the mouse, or moved with the arrow keys once selected. The selected one has handles on its
 * right edge, bottom edge and corner to make it bigger or smaller.
 */
function Canvas({
  width,
  height,
  tables,
  items,
  picked,
  bad,
  onPick,
  onMove,
  onResize,
}: {
  width: number
  height: number
  tables: ManagedTable[]
  items: FloorItem[]
  picked: Pick_
  bad: (type: "table" | "item", id: number) => boolean
  onPick: (p: Pick_) => void
  onMove: (type: "table" | "item", id: number, x: number, y: number) => void
  /** the new plan_w × plan_h (before rotation), in grid squares */
  onResize: (type: "table" | "item", id: number, w: number, h: number) => void
}) {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const [cell, setCell] = useState(0)
  const drag = useRef<{
    key: string
    px: number
    py: number
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setCell(el.clientWidth / width)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [width])

  type Piece = {
    type: "table" | "item"
    id: number
    plan_x: number
    plan_y: number
    plan_w: number
    plan_h: number
    rotation: 0 | 90 | 180 | 270
  }
  const clampMove = (p: Piece, x: number, y: number) => {
    const f = footprint(p)
    onMove(
      p.type,
      p.id,
      Math.max(0, Math.min(width - f.w, x)),
      Math.max(0, Math.min(height - f.h, y)),
    )
  }
  const handlers = (p: Piece) => {
    const k = `${p.type}${p.id}`
    return {
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        onPick({ type: p.type, id: p.id })
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = {
          key: k,
          px: e.clientX,
          py: e.clientY,
          x: p.plan_x,
          y: p.plan_y,
        }
      },
      onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
        const d = drag.current
        if (!d || d.key !== k || cell === 0) return
        const x = d.x + Math.round((e.clientX - d.px) / cell)
        const y = d.y + Math.round((e.clientY - d.py) / cell)
        if (x !== p.plan_x || y !== p.plan_y) clampMove(p, x, y)
      },
      onPointerUp: () => {
        drag.current = null
      },
      onPointerCancel: () => {
        drag.current = null
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        const step: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        }
        const s = step[e.key]
        if (!s) return
        e.preventDefault()
        clampMove(p, p.plan_x + s[0], p.plan_y + s[1])
      },
      onFocus: () => onPick({ type: p.type, id: p.id }),
    }
  }
  const place = (p: Piece) => {
    const f = footprint(p)
    return {
      left: f.x * cell,
      top: f.y * cell,
      width: f.w * cell,
      height: f.h * cell,
      cursor: "grab",
    }
  }
  const isPicked = (type: "table" | "item", id: number) =>
    picked?.type === type && picked.id === id

  // resizing the selected piece: which edge, where the pointer started, the size it had
  const sizing = useRef<{
    edge: "right" | "bottom" | "corner"
    px: number
    py: number
    w: number
    h: number
  } | null>(null)
  const pickedPiece: Piece | null =
    picked?.type === "table"
      ? (() => {
          const x = tables.find((t) => t.id === picked.id)
          return x ? { type: "table" as const, ...x } : null
        })()
      : picked?.type === "item"
        ? (() => {
            const x = items.find((i) => i.id === picked.id)
            return x ? { type: "item" as const, ...x } : null
          })()
        : null
  const resizeHandle = (p: Piece, edge: "right" | "bottom" | "corner") => {
    const f = footprint(p)
    const turned = p.rotation === 90 || p.rotation === 270
    const maxSide =
      p.type === "table" ? MAX_TABLE_SIZE : Math.max(width, height)
    return {
      onPointerDown: (e: PointerEvent<HTMLSpanElement>) => {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        sizing.current = { edge, px: e.clientX, py: e.clientY, w: f.w, h: f.h }
      },
      onPointerMove: (e: PointerEvent<HTMLSpanElement>) => {
        const s = sizing.current
        if (!s || cell === 0) return
        let fw = s.w
        let fh = s.h
        if (edge !== "bottom") fw = s.w + Math.round((e.clientX - s.px) / cell)
        if (edge !== "right") fh = s.h + Math.round((e.clientY - s.py) / cell)
        fw = Math.max(1, Math.min(maxSide, width - f.x, fw))
        fh = Math.max(1, Math.min(maxSide, height - f.y, fh))
        if (fw === f.w && fh === f.h) return
        // the footprint is turned; plan_w / plan_h are the size before turning
        if (turned) onResize(p.type, p.id, fh, fw)
        else onResize(p.type, p.id, fw, fh)
      },
      onPointerUp: () => {
        sizing.current = null
      },
      onPointerCancel: () => {
        sizing.current = null
      },
    }
  }

  const zones = items.filter((i) => i.kind === "zone")
  const objects = items.filter((i) => i.kind !== "zone")
  const itemButton = (item: FloorItem, z: string) => {
    const Icon = ITEM_ICONS[item.kind]
    const f = footprint(item)
    const roomy = Math.min(f.w, f.h) * cell > 28
    return (
      <button
        key={`i${item.id}`}
        type="button"
        aria-label={`${t(`restaurant.items.kinds.${item.kind}`)}${item.label ? `: ${item.label}` : ""}`}
        aria-pressed={isPicked("item", item.id)}
        {...handlers({ type: "item", ...item })}
        className={cn(
          "absolute flex touch-none items-center justify-center gap-1 overflow-hidden border text-[11px] leading-tight font-medium select-none sm:text-xs",
          z,
          itemLook(item),
          isPicked("item", item.id) && "ring-2 ring-primary",
          bad("item", item.id) && "border-destructive ring-2 ring-destructive",
        )}
        style={place({ type: "item", ...item })}
      >
        {item.kind !== "zone" && item.kind !== "label" && roomy && (
          <Icon className="size-3.5 shrink-0" />
        )}
        {(item.kind === "zone" || item.kind === "label" || f.w * cell > 48) && (
          <span className="truncate px-0.5">{item.label}</span>
        )}
      </button>
    )
  }

  return (
    <div
      ref={box}
      className="relative w-full overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border"
      style={{
        aspectRatio: `${width} / ${height}`,
        backgroundImage:
          "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
        backgroundSize: `${cell}px ${cell}px`,
      }}
      aria-label={t("restaurant.plan.canvas")}
    >
      {zones.map((z) => itemButton(z, "z-0"))}
      {tables.map((table) => {
        const f = footprint(table)
        const selected = isPicked("table", table.id)
        return (
          <button
            key={`t${table.id}`}
            type="button"
            aria-label={t("restaurant.table.label", {
              name: table.name,
              seats: table.seats,
            })}
            aria-pressed={selected}
            {...handlers({ type: "table", ...table })}
            className={cn(
              "absolute z-10 flex touch-none flex-col items-center justify-center overflow-hidden border-2 bg-background text-center leading-tight shadow-sm select-none",
              table.shape === "round" ? "rounded-full" : "rounded-lg",
              selected
                ? "z-30 border-primary ring-2 ring-primary/30"
                : "border-foreground/25",
              bad("table", table.id) && "border-destructive bg-destructive/10",
              !table.active && "border-dashed opacity-60",
            )}
            style={place({ type: "table", ...table })}
          >
            <span className="max-w-full truncate px-1 text-xs font-semibold sm:text-sm">
              {table.name}
            </span>
            {f.h * cell > 34 && (
              <span className="text-[11px] text-muted-foreground sm:text-xs">
                {table.seats}
                {table.extra_chairs > 0 && `+${table.extra_chairs}`}
              </span>
            )}
          </button>
        )
      })}
      {objects.map((o) => itemButton(o, "z-20"))}
      {pickedPiece && cell > 0 && (
        <ResizeFrame
          place={place(pickedPiece)}
          handle={(edge) => resizeHandle(pickedPiece, edge)}
          label={t("restaurant.plan.resize")}
        />
      )}
    </div>
  )
}

/**
 * Handles around the selected table or object: drag the right edge, the bottom edge or the corner.
 * The frame itself lets clicks through, so the piece under it can still be dragged.
 */
function ResizeFrame({
  place,
  handle,
  label,
}: {
  place: { left: number; top: number; width: number; height: number }
  handle: (
    edge: "right" | "bottom" | "corner",
  ) => Record<string, (e: PointerEvent<HTMLSpanElement>) => void>
  label: string
}) {
  const dot =
    "pointer-events-auto absolute size-3.5 touch-none rounded-sm border-2 border-primary bg-background shadow before:absolute before:-inset-3 before:content-['']"
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-40"
      style={{ ...place, cursor: undefined }}
    >
      <span
        title={label}
        {...handle("right")}
        className={cn(
          dot,
          "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize",
        )}
      />
      <span
        title={label}
        {...handle("bottom")}
        className={cn(
          dot,
          "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
        )}
      />
      <span
        title={label}
        {...handle("corner")}
        className={cn(dot, "-right-1.5 -bottom-1.5 cursor-nwse-resize")}
      />
    </div>
  )
}

/** Every table as a row: easy to find and pick on a phone */
function TableList({
  tables,
  selectedId,
  onSelect,
}: {
  tables: ManagedTable[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation()
  if (tables.length === 0) return null
  return (
    <ul className="divide-y rounded-xl bg-background ring-1 ring-border">
      {tables.map((x) => (
        <li key={x.id}>
          <button
            type="button"
            onClick={() => onSelect(x.id)}
            className={cn(
              "flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left hover:bg-muted",
              x.id === selectedId && "bg-muted",
            )}
          >
            <span className="font-medium">{x.name}</span>
            <span className="text-sm text-muted-foreground">
              {t("restaurant.table.seatsShort", { count: x.seats })}
              {x.extra_chairs > 0 &&
                ` · ${t("restaurant.table.extraShort", { count: x.extra_chairs })}`}
              {!x.active && ` · ${t("restaurant.table.off")}`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** The selected table: name, seats, extra chairs, shape, size, turn; kept until Save */
function TablePanel({
  table,
  onChange,
  onDeleted,
  canDelete,
}: {
  table: ManagedTable
  onChange: (patch: Partial<ManagedTable>) => void
  onDeleted: () => void
  canDelete: boolean
}) {
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState(false)
  const remove = useDelete(manage.deleteResource, () => {
    setDeleting(false)
    onDeleted()
  })
  return (
    <Panel
      title={table.name || t("restaurant.table.title")}
      actions={
        canDelete && (
          <DeleteButton
            what={table.name}
            open={deleting}
            onOpenChange={setDeleting}
            pending={remove.isPending}
            error={remove.error}
            onConfirm={() => remove.mutate(table.id)}
          />
        )
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="t-name">{t("setup.name")}</Label>
          <Input
            id="t-name"
            value={table.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-11 text-base lg:h-9 lg:text-sm"
          />
        </div>
        <Stepper
          label={t("restaurant.table.seats")}
          value={table.seats}
          min={1}
          max={50}
          onChange={(seats) => onChange({ seats })}
        />
        <Stepper
          label={t("restaurant.table.extra")}
          hint={t("restaurant.table.extraHint")}
          value={table.extra_chairs}
          min={0}
          max={20}
          onChange={(extra_chairs) => onChange({ extra_chairs })}
        />
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">
            {t("restaurant.table.shape")}
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {SHAPES.map((shape) => (
              <button
                key={shape}
                type="button"
                aria-pressed={table.shape === shape}
                onClick={() =>
                  onChange(
                    shape === "long" && table.plan_w <= table.plan_h
                      ? { shape, plan_w: table.plan_h + 1 }
                      : { shape },
                  )
                }
                className={cn(
                  "h-11 rounded-lg text-sm ring-1 ring-border lg:h-9",
                  table.shape === shape &&
                    "bg-primary text-primary-foreground ring-primary",
                )}
              >
                {t(`restaurant.shapes.${shape}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Stepper
            label={t("restaurant.table.width")}
            value={table.plan_w}
            min={1}
            max={MAX_TABLE_SIZE}
            onChange={(plan_w) => onChange({ plan_w })}
          />
          <Stepper
            label={t("restaurant.table.depth")}
            value={table.plan_h}
            min={1}
            max={MAX_TABLE_SIZE}
            onChange={(plan_h) => onChange({ plan_h })}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full lg:h-9"
          onClick={() =>
            onChange({
              rotation: ((table.rotation + 90) %
                360) as ManagedTable["rotation"],
            })
          }
        >
          <RotateCwIcon />
          {t("restaurant.table.turn")}
        </Button>
        <ActiveSwitch
          id="t-active"
          label={t("setup.bookable")}
          hint={t("restaurant.table.activeHint")}
          checked={table.active}
          onChange={(active) => onChange({ active })}
        />
        <p className="text-sm text-muted-foreground">
          {t("restaurant.table.moveHint")}
        </p>
      </div>
    </Panel>
  )
}

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-11 lg:size-9"
          aria-label={t("restaurant.less", { what: label })}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <MinusIcon />
        </Button>
        <span className="w-8 text-center font-semibold tabular-nums">
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-11 lg:size-9"
          aria-label={t("restaurant.more", { what: label })}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <PlusIcon />
        </Button>
      </div>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** A new table: a name and its seats; it takes the first free spot on the plan */
function AddTableDialog({
  area,
  count,
  onClose,
  onAdded,
}: {
  area: ManagedSport
  count: number
  onClose: () => void
  onAdded: (id: number) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(
    t("restaurant.table.defaultName", { n: count + 1 }),
  )
  const [seats, setSeats] = useState(4)
  const add = useChange(manage.saveResource, ["plan", "resources"])
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("restaurant.table.add")}
      description={t("restaurant.table.addLead", { area: area.name })}
      submitLabel={t("restaurant.table.add")}
      pending={add.isPending}
      error={add.error}
      onSubmit={(e) => {
        e.preventDefault()
        add.mutate(
          {
            sport_id: area.id,
            name: name.trim(),
            kind: "table",
            active: true,
            seats,
            extra_chairs: 0,
          },
          {
            onSuccess: (r) => {
              onAdded(r.id)
              onClose()
            },
          },
        )
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="new-table-name">{t("setup.name")}</Label>
        <Input
          id="new-table-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 text-base lg:h-9 lg:text-sm"
        />
      </div>
      <Stepper
        label={t("restaurant.table.seats")}
        value={seats}
        min={1}
        max={50}
        onChange={setSeats}
      />
    </FormDialog>
  )
}
