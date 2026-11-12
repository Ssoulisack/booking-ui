import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useSpaceActions } from "@/hooks/use-space"
import { useDeleteSport, useSaveSport } from "@/hooks/use-sport"
import { useDeleteResource, useSaveResource } from "@/hooks/use-space"
import {
  AlertTriangleIcon,
  BoxSelectIcon,
  CopyIcon,
  FootprintsIcon,
  KeyboardIcon,
  LayersIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  Redo2Icon,
  RotateCwIcon,
  Trash2Icon,
  Undo2Icon,
  XIcon,
} from "lucide-react"
import { useEffect, useRef, useState, type PointerEvent } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/global/form"
import { PageError } from "@/components/global/page-state"
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
  CutCorner,
  FloorItem,
  FloorItemKind,
  ZoneShape,
} from "@/types/floor-plan"
import type { ManagedTable, TableShape } from "@/types/space"
import type { ManagedSport } from "@/types/sport"
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
  zoneHolds,
} from "@/lib/floor-plan"
import {
  ITEM_ICONS,
  isLZone,
  itemLook,
  ZONE_COLORS,
  ZONE_STYLES,
  iconSize,
} from "@/components/global/floor-plan/look"
import { ZoneOutline } from "@/components/global/floor-plan/ZoneOutline"
import { useUnsaved } from "@/stores/unsaved"

import {
  clamp,
  copyName,
  copyOffset,
  isMac,
  keyOf,
  moveLimits,
  parseKey,
  resizeBox,
  zoneShapePatch,
  fitCut,
  typingOrDialog,
  type Clip,
  type ResizeEdge,
  type PieceKey,
  type PieceType,
  type Snap,
} from "./plan-edit"

import { useBiz } from "@/hooks/use-branch"
import { useFloorPlan } from "@/hooks/use-space"
import { useSportsList } from "@/hooks/use-sport"
import {
  ActiveSwitch,
  DeleteButton,
  EmptyState,
  FormDialog,
  PageHeader,
  Panel,
} from "@/components/protected/branch/ui"

const SHAPES: TableShape[] = ["square", "round", "long"]
/** A zone is shaped like a table, or is an L */
const ZONE_SHAPES: ZoneShape[] = ["square", "round", "long", "l"]
const CUT_CORNERS: CutCorner[] = ["tl", "tr", "bl", "br"]
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
          {/* floors, then that floor's areas: one block, so they read as one choice */}
          <div className="space-y-3">
            {floors.length > 1 && (
              <div
                role="tablist"
                aria-label={t("restaurant.floors.floors")}
                className="no-scrollbar flex gap-1 overflow-x-auto border-b"
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
              className="no-scrollbar flex gap-2 overflow-x-auto px-0.5 py-1"
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
  const save = useSaveSport(["sports", "plan"])
  const [deleting, setDeleting] = useState(false)
  const remove = useDeleteSport(onClose)

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
  const { key } = useBiz()
  const { saveFloorPlan, saveResource } = useSpaceActions()
  const queryClient = useQueryClient()
  const [tables, setTables] = useState(initial)
  const [items, setItems] = useState(initialItems)
  // what is selected: one piece (its panel opens) or several (move, copy and delete them together)
  const [sel, setSel] = useState<PieceKey[]>(
    initial[0] ? [keyOf("table", initial[0].id)] : [],
  )
  const [selectMode, setSelectMode] = useState(false)
  const [adding, setAdding] = useState(false)
  const picked: Pick_ = sel.length === 1 ? parseKey(sel[0]) : null
  const setPicked = (p: Pick_) => setSel(p ? [keyOf(p.type, p.id)] : [])
  const root = useRef<HTMLDivElement>(null)
  const latest = useRef<Snap>({ tables, items })
  useEffect(() => {
    latest.current = { tables, items }
  })
  // Undo / Redo: a snapshot before each change; quick arrow presses count as one
  const history = useRef<{
    past: Snap[]
    future: Snap[]
    at: number
    kind: string
  }>({
    past: [],
    future: [],
    at: 0,
    kind: "",
  })
  const [steps, setSteps] = useState({ undo: 0, redo: 0 })
  const syncSteps = () =>
    setSteps({
      undo: history.current.past.length,
      redo: history.current.future.length,
    })
  const clip = useRef<{ data: Clip } | null>(null)
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
    setItems((list) =>
      list.map((x) => (x.id === id ? fitCut({ ...x, ...patch }) : x)),
    )
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
      shape: "square",
      cut_w: 0,
      cut_h: 0,
      cut_corner: "tr",
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

  const remember = (kind = "edit") => {
    const h = history.current
    const now = Date.now()
    if (kind === "nudge" && h.kind === "nudge" && now - h.at < 700) {
      h.at = now
      return
    }
    h.past.push(latest.current)
    if (h.past.length > 100) h.past.shift()
    h.future = []
    h.kind = kind
    h.at = now
    syncSteps()
  }
  const restore = (snap: Snap) => {
    setTables(snap.tables)
    setItems(snap.items)
    const alive = new Set<PieceKey>([
      ...snap.tables.map((x) => keyOf("table", x.id)),
      ...snap.items.map((x) => keyOf("item", x.id)),
    ])
    setSel((list) => list.filter((k) => alive.has(k)))
  }
  const undo = () => {
    const h = history.current
    const snap = h.past.pop()
    if (!snap) return
    h.future.push(latest.current)
    h.kind = ""
    restore(snap)
    syncSteps()
  }
  const redo = () => {
    const h = history.current
    const snap = h.future.pop()
    if (!snap) return
    h.past.push(latest.current)
    h.kind = ""
    restore(snap)
    syncSteps()
  }
  /** The selected tables and objects, as they are now */
  const selected = (): Clip => {
    const keys = new Set(sel)
    return {
      tables: latest.current.tables.filter((x) =>
        keys.has(keyOf("table", x.id)),
      ),
      items: latest.current.items.filter((x) => keys.has(keyOf("item", x.id))),
    }
  }
  const moveMany = (
    moves: Array<{ type: PieceType; id: number; x: number; y: number }>,
  ) => {
    const to = new Map(moves.map((m) => [keyOf(m.type, m.id), m]))
    setTables((list) =>
      list.map((x) => {
        const m = to.get(keyOf("table", x.id))
        return m ? { ...x, plan_x: m.x, plan_y: m.y } : x
      }),
    )
    setItems((list) =>
      list.map((x) => {
        const m = to.get(keyOf("item", x.id))
        return m ? { ...x, plan_x: m.x, plan_y: m.y } : x
      }),
    )
  }
  /** Arrow keys: the whole selection one square (Shift: five), staying on the plan */
  const nudge = (dx: number, dy: number) => {
    const c = selected()
    const pieces = [...c.tables, ...c.items]
    if (pieces.length === 0) return
    const lim = moveLimits(pieces, W, H)
    const mx = clamp(dx, lim.minDx, lim.maxDx)
    const my = clamp(dy, lim.minDy, lim.maxDy)
    if (mx === 0 && my === 0) return
    remember("nudge")
    moveMany([
      ...c.tables.map((x) => ({
        type: "table" as const,
        id: x.id,
        x: x.plan_x + mx,
        y: x.plan_y + my,
      })),
      ...c.items.map((x) => ({
        type: "item" as const,
        id: x.id,
        x: x.plan_x + mx,
        y: x.plan_y + my,
      })),
    ])
  }
  /** Copies of tables and objects, a little to the side of the originals; they become the selection */
  const paste = (data: Clip) => {
    if (data.tables.length + data.items.length === 0) return
    const { dx, dy } = copyOffset(
      data,
      latest.current.tables,
      latest.current.items.filter(blocks),
      W,
      H,
    )
    remember("paste")
    const taken = new Set(latest.current.tables.map((x) => x.name))
    const madeTables = data.tables.map((x) => {
      const name = copyName(x.name, taken)
      taken.add(name)
      return {
        ...x,
        id: nextNewId--,
        name,
        plan_x: x.plan_x + dx,
        plan_y: x.plan_y + dy,
      }
    })
    const madeItems = data.items.map((x) => ({
      ...x,
      id: nextNewId--,
      plan_x: x.plan_x + dx,
      plan_y: x.plan_y + dy,
    }))
    setTables((list) => [...list, ...madeTables])
    setItems((list) => [...list, ...madeItems])
    setSel([
      ...madeTables.map((x) => keyOf("table", x.id)),
      ...madeItems.map((x) => keyOf("item", x.id)),
    ])
  }
  const duplicate = () => paste(selected())
  const copy = () => {
    const data = selected()
    if (data.tables.length + data.items.length === 0) return
    clip.current = { data }
    toast.success(
      t("restaurant.plan.copied", {
        count: data.tables.length + data.items.length,
      }),
    )
  }
  const pasteCopied = () => {
    const c = clip.current
    if (!c) return
    paste(c.data)
  }
  // objects and copies that are not saved yet can be removed here; saved tables are deleted one by one
  const canRemove = (k: PieceKey) => {
    const { type, id } = parseKey(k)
    return type === "item" || id < 0
  }
  const removeSelected = () => {
    const gone = new Set(sel.filter(canRemove))
    if (gone.size === 0) {
      if (sel.length > 0) toast.info(t("restaurant.plan.savedTablesStay"))
      return
    }
    remember("delete")
    setItems((list) => list.filter((x) => !gone.has(keyOf("item", x.id))))
    setTables((list) => list.filter((x) => !gone.has(keyOf("table", x.id))))
    const kept = sel.filter((k) => !gone.has(k))
    setSel(kept)
    if (kept.length > 0) toast.info(t("restaurant.plan.savedTablesStay"))
  }
  const selectAll = () =>
    setSel([
      ...latest.current.tables.map((x) => keyOf("table", x.id)),
      ...latest.current.items
        .filter((x) => x.kind !== "zone")
        .map((x) => keyOf("item", x.id)),
    ])

  // one Save: every table's place and every object (checked together), then the tables whose details changed
  const save = useMutation({
    mutationFn: async () => {
      await saveFloorPlan({
        areaId: area.id,
        plan_width: W,
        plan_height: H,
        tables: tables
          .filter((x) => x.id > 0)
          .map((x) => ({
            id: x.id,
            plan_x: x.plan_x,
            plan_y: x.plan_y,
            plan_w: x.plan_w,
            plan_h: x.plan_h,
            rotation: x.rotation,
            shape: x.shape,
          })),
        // copies made on this screen: created by the same save
        new_tables: tables
          .filter((x) => x.id < 0)
          .map((x) => ({
            name: x.name,
            seats: x.seats,
            extra_chairs: x.extra_chairs,
            active: x.active,
            walk_in_only: !!x.walk_in_only,
            shape: x.shape,
            plan_x: x.plan_x,
            plan_y: x.plan_y,
            plan_w: x.plan_w,
            plan_h: x.plan_h,
            rotation: x.rotation,
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
            was.active !== x.active ||
            !!was.walk_in_only !== !!x.walk_in_only)
        ) {
          await saveResource({ ...x, kind: "table" })
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

  // keyboard shortcuts (⌘ on a Mac, Ctrl on Windows and Linux); never while typing in a field or in a dialog
  const keys = useRef<(e: KeyboardEvent) => void>(() => {})
  const onKey = (e: KeyboardEvent) => {
    if (typingOrDialog(e.target)) return
    const el = e.target instanceof HTMLElement ? e.target : null
    const onPlan = el === document.body || !el || !!root.current?.contains(el)
    if (!onPlan) return
    const mod = e.metaKey || e.ctrlKey
    const k = e.key.toLowerCase()
    const hasText = !!window.getSelection()?.toString()
    const done = () => e.preventDefault()
    if (mod && k === "s") {
      done()
      if (dirty && !problems && !save.isPending) save.mutate()
    } else if (mod && k === "z" && !e.shiftKey) {
      done()
      undo()
    } else if (mod && (k === "y" || (k === "z" && e.shiftKey))) {
      done()
      redo()
    } else if (mod && k === "a") {
      done()
      selectAll()
    } else if (mod && k === "d") {
      done()
      duplicate()
    } else if (mod && k === "c" && !hasText) {
      if (sel.length > 0) {
        done()
        copy()
      }
    } else if (mod && k === "v") {
      if (clip.current) {
        done()
        pasteCopied()
      }
    } else if (!mod && (e.key === "Delete" || e.key === "Backspace")) {
      if (sel.length > 0) {
        done()
        removeSelected()
      }
    } else if (!mod && e.key === "Escape") {
      if (sel.length > 0) setSel([])
    } else if (!mod && e.key.startsWith("Arrow") && sel.length > 0) {
      done()
      const n = e.shiftKey ? 5 : 1
      nudge(
        e.key === "ArrowLeft" ? -n : e.key === "ArrowRight" ? n : 0,
        e.key === "ArrowUp" ? -n : e.key === "ArrowDown" ? n : 0,
      )
    }
  }
  useEffect(() => {
    keys.current = onKey
  })
  useEffect(() => {
    const on = (e: KeyboardEvent) => keys.current(e)
    window.addEventListener("keydown", on)
    return () => window.removeEventListener("keydown", on)
  }, [])

  return (
    <div ref={root} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
            <Button
              variant="ghost"
              size="icon-lg"
              className="size-11 lg:size-9"
              aria-label={t("restaurant.plan.undoStep")}
              title={`${t("restaurant.plan.undoStep")} (${isMac ? "⌘Z" : "Ctrl+Z"})`}
              disabled={steps.undo === 0}
              onClick={undo}
            >
              <Undo2Icon />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              className="size-11 lg:size-9"
              aria-label={t("restaurant.plan.redoStep")}
              title={`${t("restaurant.plan.redoStep")} (${isMac ? "⇧⌘Z" : "Ctrl+Y"})`}
              disabled={steps.redo === 0}
              onClick={redo}
            >
              <Redo2Icon />
            </Button>
            <Button
              variant={selectMode ? "default" : "outline"}
              className="h-11 lg:h-9"
              aria-pressed={selectMode}
              title={t("restaurant.plan.selectModeHint")}
              onClick={() => setSelectMode((v) => !v)}
            >
              <BoxSelectIcon />
              {t("restaurant.plan.selectMode")}
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
          selected={new Set(sel)}
          selectMode={selectMode}
          bad={(type, id) =>
            type === "table"
              ? clashing.has(id) || outside.has(id)
              : itemsOutside.has(id)
          }
          onSelect={setSel}
          onBegin={remember}
          onMoveMany={moveMany}
          onResize={(type, id, patch) =>
            type === "table" ? update(id, patch) : updateItem(id, patch)
          }
        />
        <ShortcutHints />
        {problems && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangleIcon className="size-4 shrink-0" />
            {t("restaurant.plan.problems")}
          </p>
        )}
      </div>

      {/* phone: the selected table's panel and Save come right under the plan, the list after them */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:row-span-2 lg:max-h-[calc(100dvh-6rem)] lg:self-start">
        {/* the settings scroll by themselves; Save and Undo below stay in view */}
        <div className="min-h-0 space-y-4 lg:flex-1 lg:overflow-y-auto">
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
              // a copy that is not saved yet is just taken off the plan
              onRemoveCopy={
                selectedTable.id < 0
                  ? () => {
                      remember("delete")
                      setTables((list) =>
                        list.filter((x) => x.id !== selectedTable.id),
                      )
                      setSel([])
                    }
                  : undefined
              }
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
          ) : sel.length > 1 ? (
            <MultiPanel
              tables={sel.filter((k) => parseKey(k).type === "table").length}
              objects={sel.filter((k) => parseKey(k).type === "item").length}
              canRemove={sel.some(canRemove)}
              onDuplicate={duplicate}
              onRemove={removeSelected}
              onClear={() => setSel([])}
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
        </div>
        {/* phone: Save is pinned to the bottom of the screen; on a laptop it sits under the settings, always in view */}
        <div aria-hidden className="h-28 lg:hidden" />
        <div className="fixed inset-x-0 bottom-0 z-30 space-y-2 border-t bg-background p-3 lg:static lg:z-auto lg:shrink-0 lg:border-0 lg:p-0">
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
          zones={items.filter((i) => i.kind === "zone")}
          selected={new Set(sel)}
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
        {item.kind === "zone" && (
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">
              {t("restaurant.table.shape")}
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ZONE_SHAPES.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  aria-pressed={item.shape === shape}
                  onClick={() =>
                    onChange(zoneShapePatch(item, shape, maxW, maxH))
                  }
                  className={cn(
                    "h-11 rounded-lg text-sm ring-1 ring-border lg:h-9",
                    item.shape === shape &&
                      "bg-primary text-primary-foreground ring-primary",
                  )}
                >
                  {t(`restaurant.shapes.${shape}`)}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {isLZone(item) && (
          <div className="space-y-3">
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">
                {t("restaurant.items.cutCorner")}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {CUT_CORNERS.map((corner) => (
                  <button
                    key={corner}
                    type="button"
                    aria-pressed={item.cut_corner === corner}
                    onClick={() => onChange({ cut_corner: corner })}
                    className={cn(
                      "h-11 rounded-lg text-sm ring-1 ring-border lg:h-9",
                      item.cut_corner === corner &&
                        "bg-primary text-primary-foreground ring-primary",
                    )}
                  >
                    {t(`restaurant.items.corners.${corner}`)}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Stepper
                label={t("restaurant.items.cutW")}
                value={item.cut_w}
                min={1}
                max={item.plan_w - 1}
                onChange={(cut_w) => onChange({ cut_w })}
              />
              <Stepper
                label={t("restaurant.items.cutH")}
                value={item.cut_h}
                min={1}
                max={item.plan_h - 1}
                onChange={(cut_h) => onChange({ cut_h })}
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Stepper
            label={t("restaurant.table.width")}
            value={item.plan_w}
            min={item.shape === "l" ? 2 : 1}
            max={maxW}
            onChange={(plan_w) => onChange({ plan_w })}
          />
          <Stepper
            label={t("restaurant.table.depth")}
            value={item.plan_h}
            min={item.shape === "l" ? 2 : 1}
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
 * The grid with the zones (behind), the tables and the objects. Click one to select it; Shift,
 * Ctrl or ⌘ click adds or removes pieces, and dragging on the empty grid draws a rectangle that
 * selects what it touches. Drag any selected piece to move the whole selection together. A single
 * selected piece has handles on its right edge, bottom edge and corner to make it bigger or smaller.
 */
function Canvas({
  width,
  height,
  tables,
  items,
  selected,
  selectMode,
  bad,
  onSelect,
  onBegin,
  onMoveMany,
  onResize,
}: {
  width: number
  height: number
  tables: ManagedTable[]
  items: FloorItem[]
  selected: Set<PieceKey>
  /** taps add and remove pieces, and dragging on the plan draws the selection rectangle (phones) */
  selectMode: boolean
  bad: (type: "table" | "item", id: number) => boolean
  onSelect: (keys: PieceKey[]) => void
  /** a change is about to start (for Undo) */
  onBegin: (kind: string) => void
  onMoveMany: (
    moves: Array<{ type: PieceType; id: number; x: number; y: number }>,
  ) => void
  /** the new plan_w × plan_h (before rotation), in grid squares */
  /** a new size, and a new position when the top or left edge was dragged */
  onResize: (
    type: "table" | "item",
    id: number,
    patch: { plan_w: number; plan_h: number; plan_x?: number; plan_y?: number },
  ) => void
}) {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const [cell, setCell] = useState(0)
  const drag = useRef<{
    key: PieceKey
    px: number
    py: number
    moved: boolean
    wasInGroup: boolean
    starts: Array<{
      type: PieceType
      id: number
      x: number
      y: number
      piece: Piece
    }>
  } | null>(null)
  // the selection rectangle, in pixels inside the plan
  const [rect, setRect] = useState<{
    x0: number
    y0: number
    x1: number
    y1: number
  } | null>(null)
  const lasso = useRef<{ x0: number; y0: number; additive: boolean } | null>(
    null,
  )

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
    type: PieceType
    id: number
    plan_x: number
    plan_y: number
    plan_w: number
    plan_h: number
    rotation: 0 | 90 | 180 | 270
  }
  const pieceOf = (k: PieceKey): Piece | null => {
    const { type, id } = parseKey(k)
    if (type === "table") {
      const x = tables.find((v) => v.id === id)
      return x ? { type, ...x } : null
    }
    const x = items.find((v) => v.id === id)
    return x ? { type, ...x } : null
  }
  const isSel = (type: PieceType, id: number) => selected.has(keyOf(type, id))
  const additiveKey = (e: {
    shiftKey: boolean
    metaKey: boolean
    ctrlKey: boolean
  }) => e.shiftKey || e.metaKey || e.ctrlKey

  const startLasso = (e: PointerEvent<HTMLElement>) => {
    const el = box.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    lasso.current = { x0: x, y0: y, additive: additiveKey(e) }
    setRect({ x0: x, y0: y, x1: x, y1: y })
    el.setPointerCapture(e.pointerId)
  }
  const moveLasso = (e: PointerEvent<HTMLDivElement>) => {
    const l = lasso.current
    const el = box.current
    if (!l || !el) return
    const r = el.getBoundingClientRect()
    setRect({
      x0: l.x0,
      y0: l.y0,
      x1: e.clientX - r.left,
      y1: e.clientY - r.top,
    })
  }
  const endLasso = (cancel: boolean) => {
    const l = lasso.current
    const r = rect
    lasso.current = null
    setRect(null)
    if (!l || !r || cancel || cell === 0) return
    const left = Math.min(r.x0, r.x1)
    const right = Math.max(r.x0, r.x1)
    const top = Math.min(r.y0, r.y1)
    const bottom = Math.max(r.y0, r.y1)
    if (right - left < 4 && bottom - top < 4) {
      // a click on the empty plan: nothing selected any more
      if (!l.additive) onSelect([])
      return
    }
    const hit = (p: Piece, whole: boolean) => {
      const f = footprint(p)
      const a = f.x * cell
      const b = (f.x + f.w) * cell
      const c = f.y * cell
      const d = (f.y + f.h) * cell
      return whole
        ? a >= left && b <= right && c >= top && d <= bottom
        : a < right && b > left && c < bottom && d > top
    }
    const keys: PieceKey[] = [
      ...tables
        .filter((x) => hit({ type: "table", ...x }, false))
        .map((x) => keyOf("table", x.id)),
      // a zone is only taken when the rectangle holds all of it (it would else be taken by every drag)
      ...items
        .filter((x) => hit({ type: "item", ...x }, x.kind === "zone"))
        .map((x) => keyOf("item", x.id)),
    ]
    onSelect(l.additive ? [...new Set([...selected, ...keys])] : keys)
  }

  const handlers = (p: Piece) => {
    const k = keyOf(p.type, p.id)
    return {
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0) return
        // on a zone, Alt (or Select several) starts the rectangle: zones are big and lie under everything
        if (p.type === "item" && (e.altKey || selectMode)) {
          const item = items.find((v) => v.id === p.id)
          if (item?.kind === "zone") {
            startLasso(e)
            return
          }
        }
        // Shift / Ctrl / ⌘ (or Select several): add or remove this piece, no dragging
        if (additiveKey(e) || selectMode) {
          onSelect(
            selected.has(k)
              ? [...selected].filter((x) => x !== k)
              : [...selected, k],
          )
          return
        }
        const inGroup = selected.has(k) && selected.size > 1
        const group: PieceKey[] = inGroup ? [...selected] : [k]
        if (!inGroup) onSelect([k])
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = {
          key: k,
          px: e.clientX,
          py: e.clientY,
          moved: false,
          wasInGroup: inGroup,
          starts: group.flatMap((g) => {
            const piece = pieceOf(g)
            return piece
              ? [
                  {
                    type: piece.type,
                    id: piece.id,
                    x: piece.plan_x,
                    y: piece.plan_y,
                    piece,
                  },
                ]
              : []
          }),
        }
      },
      onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
        const d = drag.current
        if (!d || d.key !== k || cell === 0) return
        let dx = Math.round((e.clientX - d.px) / cell)
        let dy = Math.round((e.clientY - d.py) / cell)
        if (dx === 0 && dy === 0 && !d.moved) return
        // the whole group stays on the plan
        const lim = moveLimits(
          d.starts.map((s) => s.piece),
          width,
          height,
        )
        dx = clamp(dx, lim.minDx, lim.maxDx)
        dy = clamp(dy, lim.minDy, lim.maxDy)
        if (!d.moved) {
          if (dx === 0 && dy === 0) return
          d.moved = true
          onBegin("move")
        }
        onMoveMany(
          d.starts.map((s) => ({
            type: s.type,
            id: s.id,
            x: s.x + dx,
            y: s.y + dy,
          })),
        )
      },
      onPointerUp: () => {
        const d = drag.current
        drag.current = null
        // a click (no drag) on one of several selected pieces keeps just that one
        if (d && !d.moved && d.wasInGroup) onSelect([d.key])
      },
      onPointerCancel: () => {
        drag.current = null
      },
      // from the keyboard: Enter or Space picks the piece (arrows move the selection: see the editor)
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key !== "Enter" && e.key !== " ") return
        e.preventDefault()
        if (additiveKey(e)) {
          onSelect(
            selected.has(k)
              ? [...selected].filter((x) => x !== k)
              : [...selected, k],
          )
        } else onSelect([k])
      },
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

  // resizing the one selected piece: which edge, where the pointer started, the rectangle it had
  const sizing = useRef<{
    edge: ResizeEdge
    px: number
    py: number
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const only = selected.size === 1 ? pieceOf([...selected][0]) : null
  const resizeHandle = (p: Piece, edge: ResizeEdge) => {
    const f = footprint(p)
    const turned = p.rotation === 90 || p.rotation === 270
    const maxSide =
      p.type === "table" ? MAX_TABLE_SIZE : Math.max(width, height)
    // an L zone needs a box of at least 2 x 2 for its cut-out
    const minSide =
      p.type === "item" && items.find((x) => x.id === p.id)?.shape === "l"
        ? 2
        : 1
    return {
      onPointerDown: (e: PointerEvent<HTMLSpanElement>) => {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        onBegin("resize")
        sizing.current = { edge, px: e.clientX, py: e.clientY, ...f }
      },
      onPointerMove: (e: PointerEvent<HTMLSpanElement>) => {
        const s = sizing.current
        if (!s || cell === 0) return
        const box = resizeBox(
          edge,
          s,
          Math.round((e.clientX - s.px) / cell),
          Math.round((e.clientY - s.py) / cell),
          maxSide,
          width,
          height,
          minSide,
        )
        if (box.x === f.x && box.y === f.y && box.w === f.w && box.h === f.h)
          return
        // the footprint is turned; plan_w / plan_h are the size before turning
        onResize(p.type, p.id, {
          plan_w: turned ? box.h : box.w,
          plan_h: turned ? box.w : box.h,
          plan_x: box.x,
          plan_y: box.y,
        })
      },
      onPointerUp: () => {
        sizing.current = null
      },
      onPointerCancel: () => {
        sizing.current = null
      },
    }
  }

  // a dashed frame round the whole selection, when there are several pieces
  const group =
    selected.size > 1
      ? (() => {
          const fps = [...selected].flatMap((k) => {
            const p = pieceOf(k)
            return p ? [footprint(p)] : []
          })
          if (fps.length === 0) return null
          const x0 = Math.min(...fps.map((f) => f.x))
          const y0 = Math.min(...fps.map((f) => f.y))
          const x1 = Math.max(...fps.map((f) => f.x + f.w))
          const y1 = Math.max(...fps.map((f) => f.y + f.h))
          return {
            left: x0 * cell - 4,
            top: y0 * cell - 4,
            width: (x1 - x0) * cell + 8,
            height: (y1 - y0) * cell + 8,
          }
        })()
      : null

  const zones = items.filter((i) => i.kind === "zone")
  const objects = items.filter((i) => i.kind !== "zone")
  const itemButton = (item: FloorItem, z: string) => {
    const Icon = ITEM_ICONS[item.kind]
    const f = footprint(item)
    const side = Math.min(f.w, f.h) * cell
    const named =
      item.kind === "zone" || item.kind === "label" || f.w * cell > 48
    return (
      <button
        key={`i${item.id}`}
        type="button"
        aria-label={`${t(`restaurant.items.kinds.${item.kind}`)}${item.label ? `: ${item.label}` : ""}`}
        aria-pressed={isSel("item", item.id)}
        {...handlers({ type: "item", ...item })}
        className={cn(
          "absolute flex touch-none items-center justify-center gap-1 overflow-hidden border text-[11px] leading-tight font-medium select-none sm:text-xs",
          z,
          itemLook(item),
          isSel("item", item.id) && "ring-2 ring-primary",
          bad("item", item.id) && "border-destructive ring-2 ring-destructive",
        )}
        style={place({ type: "item", ...item })}
      >
        <ZoneOutline zone={item} />
        {item.kind !== "zone" &&
          item.kind !== "label" &&
          (side > 28 || !named) && (
            <Icon
              className="shrink-0"
              style={{ width: iconSize(side), height: iconSize(side) }}
            />
          )}
        {named && (
          <span className="relative truncate px-0.5">{item.label}</span>
        )}
      </button>
    )
  }

  return (
    <div
      ref={box}
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border",
        selectMode && "touch-none",
      )}
      style={{
        aspectRatio: `${width} / ${height}`,
        backgroundImage:
          "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
        backgroundSize: `${cell}px ${cell}px`,
      }}
      aria-label={t("restaurant.plan.canvas")}
      onPointerDown={(e) => {
        // the empty plan (not a piece): the selection rectangle
        if (
          e.target === e.currentTarget &&
          (e.pointerType !== "mouse" || e.button === 0)
        )
          startLasso(e)
      }}
      onPointerMove={moveLasso}
      onPointerUp={() => endLasso(false)}
      onPointerCancel={() => endLasso(true)}
    >
      {zones.map((z) => itemButton(z, "z-0"))}
      {tables.map((table) => {
        const f = footprint(table)
        const picked = isSel("table", table.id)
        return (
          <button
            key={`t${table.id}`}
            type="button"
            aria-label={t("restaurant.table.label", {
              name: table.name,
              seats: table.seats,
            })}
            aria-pressed={picked}
            {...handlers({ type: "table", ...table })}
            className={cn(
              "absolute z-10 flex touch-none flex-col items-center justify-center overflow-hidden border-2 bg-background text-center leading-tight shadow-sm select-none",
              table.shape === "round" ? "rounded-full" : "rounded-lg",
              picked
                ? "z-30 border-primary ring-2 ring-primary/30"
                : "border-foreground/25",
              bad("table", table.id) && "border-destructive bg-destructive/10",
              !table.active && "border-dashed opacity-60",
              table.walk_in_only &&
                !picked &&
                "border-amber-500 bg-amber-50 dark:bg-amber-950/40",
              table.id < 0 && !picked && "border-dashed border-primary/60",
            )}
            style={place({ type: "table", ...table })}
          >
            <span className="max-w-full truncate px-1 text-xs font-semibold sm:text-sm">
              {table.name}
            </span>
            {table.walk_in_only && (
              <FootprintsIcon
                aria-label={t("restaurant.table.walkInShort")}
                className="absolute top-0.5 right-0.5 size-3 text-amber-700 dark:text-amber-300"
              />
            )}
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
      {group && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-40 rounded-md border-2 border-dashed border-primary"
          style={group}
        />
      )}
      {only && cell > 0 && (
        <ResizeFrame
          place={place(only)}
          handle={(edge) => resizeHandle(only, edge)}
          label={t("restaurant.plan.resize")}
        />
      )}
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-50 border border-primary bg-primary/15"
          style={{
            left: Math.min(rect.x0, rect.x1),
            top: Math.min(rect.y0, rect.y1),
            width: Math.abs(rect.x1 - rect.x0),
            height: Math.abs(rect.y1 - rect.y0),
          }}
        />
      )}
    </div>
  )
}

/** What several selected pieces can do together */
function MultiPanel({
  tables,
  objects,
  canRemove,
  onDuplicate,
  onRemove,
  onClear,
}: {
  tables: number
  objects: number
  canRemove: boolean
  onDuplicate: () => void
  onRemove: () => void
  onClear: () => void
}) {
  const { t } = useTranslation()
  const mod = isMac ? "⌘" : "Ctrl+"
  return (
    <Panel
      title={t("restaurant.plan.selectedTitle", { count: tables + objects })}
      lead={[
        tables > 0 && t("restaurant.plan.selectedTables", { count: tables }),
        objects > 0 && t("restaurant.plan.selectedObjects", { count: objects }),
      ]
        .filter(Boolean)
        .join(" · ")}
    >
      <div className="space-y-2">
        <Button
          type="button"
          className="h-11 w-full justify-between lg:h-9"
          onClick={onDuplicate}
        >
          <span className="flex items-center gap-2">
            <CopyIcon />
            {t("restaurant.plan.duplicate")}
          </span>
          <kbd className="text-xs opacity-70">{mod}D</kbd>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-between lg:h-9"
          disabled={!canRemove}
          onClick={onRemove}
        >
          <span className="flex items-center gap-2">
            <Trash2Icon />
            {t("restaurant.plan.removeSelected")}
          </span>
          <kbd className="text-xs opacity-70">{isMac ? "⌫" : "Del"}</kbd>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full justify-between lg:h-9"
          onClick={onClear}
        >
          <span className="flex items-center gap-2">
            <XIcon />
            {t("restaurant.plan.clearSelection")}
          </span>
          <kbd className="text-xs opacity-70">Esc</kbd>
        </Button>
        <p className="text-sm text-muted-foreground">
          {t("restaurant.plan.moveTogetherHint")}
        </p>
      </div>
    </Panel>
  )
}

/** The shortcuts, written for the keyboard in use (⌘ ⇧ ⌫ on a Mac, Ctrl Shift Del elsewhere) */
function ShortcutHints() {
  const { t } = useTranslation()
  const mod = isMac ? "⌘" : "Ctrl"
  const sep = isMac ? "" : "+"
  const rows: Array<[string, string]> = [
    [`${mod}${sep}A`, t("restaurant.plan.keys.all")],
    [`${mod}${sep}C  /  ${mod}${sep}V`, t("restaurant.plan.keys.copyPaste")],
    [`${mod}${sep}D`, t("restaurant.plan.keys.duplicate")],
    [isMac ? "⌫" : "Delete", t("restaurant.plan.keys.delete")],
    [isMac ? "← ↑ → ↓" : "← ↑ → ↓", t("restaurant.plan.keys.arrows")],
    [
      isMac ? "⇧ ← ↑ → ↓" : "Shift + ← ↑ → ↓",
      t("restaurant.plan.keys.arrowsFive"),
    ],
    [
      `${isMac ? "⇧" : "Shift"} / ${mod} ${t("restaurant.plan.keys.click")}`,
      t("restaurant.plan.keys.addRemove"),
    ],
    [t("restaurant.plan.keys.dragEmpty"), t("restaurant.plan.keys.rectangle")],
    [
      `${mod}${sep}Z  /  ${isMac ? "⇧⌘Z" : "Ctrl+Y"}`,
      t("restaurant.plan.keys.undoRedo"),
    ],
    [`${mod}${sep}S`, t("restaurant.plan.keys.save")],
    ["Esc", t("restaurant.plan.keys.clear")],
  ]
  return (
    <details className="group rounded-xl bg-background ring-1 ring-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium">
        <KeyboardIcon className="size-4" />
        {t("restaurant.plan.shortcuts")}
      </summary>
      <dl className="grid gap-x-6 gap-y-1.5 px-4 pb-4 text-sm sm:grid-cols-[auto_1fr]">
        {rows.map(([keys, what]) => (
          <div key={keys} className="contents">
            <dt>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                {keys}
              </kbd>
            </dt>
            <dd className="text-muted-foreground">{what}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

/**
 * Handles around the selected table or object: drag any side or any corner. The frame itself lets clicks through,
 * so the piece under it can still be dragged.
 */
function ResizeFrame({
  place,
  handle,
  label,
}: {
  place: { left: number; top: number; width: number; height: number }
  handle: (
    edge: ResizeEdge,
  ) => Record<string, (e: PointerEvent<HTMLSpanElement>) => void>
  label: string
}) {
  const dot =
    "pointer-events-auto absolute size-3.5 touch-none rounded-sm border-2 border-primary bg-background shadow before:absolute before:-inset-3 before:content-['']"
  // the sides first, the corners last (on top), so a corner wins where their touch areas meet
  const handles: [ResizeEdge, string][] = [
    ["e", "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize"],
    ["w", "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize"],
    ["s", "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize"],
    ["n", "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize"],
    ["se", "-right-1.5 -bottom-1.5 cursor-nwse-resize"],
    ["nw", "-top-1.5 -left-1.5 cursor-nwse-resize"],
    ["ne", "-top-1.5 -right-1.5 cursor-nesw-resize"],
    ["sw", "-bottom-1.5 -left-1.5 cursor-nesw-resize"],
  ]
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-40"
      style={{ ...place, cursor: undefined }}
    >
      {handles.map(([edge, where]) => (
        <span
          key={edge}
          title={label}
          {...handle(edge)}
          className={cn(dot, where)}
        />
      ))}
    </div>
  )
}

/**
 * Every table as a small tile, grouped by size: first by the number of seats, and inside each size by the zone
 * the table stands in (when the plan has zones). Far shorter than a row per table, and easy to hit on a phone.
 */
export function TableList({
  tables,
  zones,
  selected,
  onSelect,
}: {
  tables: ManagedTable[]
  zones: FloorItem[]
  selected: Set<PieceKey>
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation()
  if (tables.length === 0) return null
  const byName = (a: ManagedTable, b: ManagedTable) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  // the zone a table stands in (the first one that holds its centre)
  const zoneOf = (x: ManagedTable) => zones.find((z) => zoneHolds(z, x))
  const sizes = [...new Set(tables.map((x) => x.seats))].sort((a, b) => a - b)
  const anyZone = tables.some((x) => zoneOf(x))
  return (
    <div className="space-y-4">
      {sizes.map((seats) => {
        const group = tables.filter((x) => x.seats === seats).sort(byName)
        // inside a size: one block per zone (zones in plan order), then the tables outside every zone
        const parts: {
          id: number | "none"
          zone?: FloorItem
          list: ManagedTable[]
        }[] = []
        if (anyZone) {
          for (const z of zones) {
            const list = group.filter((x) => zoneOf(x)?.id === z.id)
            if (list.length) parts.push({ id: z.id, zone: z, list })
          }
          const rest = group.filter((x) => !zoneOf(x))
          if (rest.length) parts.push({ id: "none", list: rest })
        } else parts.push({ id: "none", list: group })
        return (
          <section
            key={seats}
            className="rounded-xl bg-background p-3 ring-1 ring-border"
          >
            <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
              {t("restaurant.table.seatsShort", { count: seats })}
              <span className="font-normal text-muted-foreground">
                {t("restaurant.table.groupCount", { count: group.length })}
              </span>
            </h3>
            <div className="space-y-3">
              {parts.map((blk) => (
                <div key={blk.id}>
                  {anyZone && (
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2.5 rounded-full border",
                          blk.zone?.color
                            ? ZONE_STYLES[blk.zone.color]
                            : "border-border bg-muted",
                        )}
                      />
                      {blk.zone
                        ? blk.zone.label.trim() ||
                          t("restaurant.table.zoneUnnamed")
                        : t("restaurant.table.noZone")}
                      <span className="font-normal">· {blk.list.length}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {blk.list.map((x) => {
                      const zone = zoneOf(x)
                      return (
                        <button
                          key={x.id}
                          type="button"
                          onClick={() => onSelect(x.id)}
                          aria-pressed={selected.has(keyOf("table", x.id))}
                          title={[
                            x.name,
                            t("restaurant.table.seatsShort", {
                              count: x.seats,
                            }),
                            x.extra_chairs > 0
                              ? t("restaurant.table.extraShort", {
                                  count: x.extra_chairs,
                                })
                              : "",
                            x.active ? "" : t("restaurant.table.off"),
                            x.walk_in_only
                              ? t("restaurant.table.walkInShort")
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          className={cn(
                            "relative flex min-h-11 min-w-14 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors hover:brightness-95",
                            zone?.color
                              ? ZONE_STYLES[zone.color]
                              : "border-border bg-card",
                            !x.active && "border-dashed opacity-55",
                            selected.has(keyOf("table", x.id)) &&
                              "ring-2 ring-primary ring-offset-1 ring-offset-background",
                          )}
                        >
                          {x.name}
                          {x.extra_chairs > 0 && (
                            <span className="ml-1 text-xs font-normal opacity-70">
                              +{x.extra_chairs}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** The selected table: name, seats, extra chairs, shape, size, turn; kept until Save */
function TablePanel({
  table,
  onChange,
  onDeleted,
  onRemoveCopy,
  canDelete,
}: {
  table: ManagedTable
  onChange: (patch: Partial<ManagedTable>) => void
  onDeleted: () => void
  /** a copy that is not saved yet: remove it from the plan (no delete question, nothing stored) */
  onRemoveCopy?: () => void
  canDelete: boolean
}) {
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState(false)
  const remove = useDeleteResource(() => {
    setDeleting(false)
    onDeleted()
  })
  return (
    <Panel
      title={table.name || t("restaurant.table.title")}
      actions={
        onRemoveCopy ? (
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 lg:size-9"
            aria-label={t("restaurant.plan.removeCopy")}
            onClick={onRemoveCopy}
          >
            <Trash2Icon />
          </Button>
        ) : (
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
        <ActiveSwitch
          id="t-walkin"
          label={t("restaurant.table.walkInOnly")}
          hint={t("restaurant.table.walkInOnlyHint")}
          checked={!!table.walk_in_only}
          onChange={(walk_in_only) => onChange({ walk_in_only })}
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
  const add = useSaveResource(["plan", "resources"])
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
