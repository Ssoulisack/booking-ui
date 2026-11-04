import {
  CircleDotIcon,
  DoorOpenIcon,
  FootprintsIcon,
  MartiniIcon,
  MicVocalIcon,
  SquareDashedIcon,
  ToiletIcon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react"

import type { FloorItem, FloorItemKind, ZoneColor } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// How floor plan objects look: the same in the editor and on the public booking page

export const ITEM_ICONS: Record<FloorItemKind, LucideIcon> = {
  bar: MartiniIcon,
  pole: CircleDotIcon,
  stage: MicVocalIcon,
  toilet: ToiletIcon,
  entry: DoorOpenIcon,
  label: TypeIcon,
  zone: SquareDashedIcon,
  stairs: FootprintsIcon,
}

/** Zone colours: a light fill behind the tables, a darker border and name (lighter on the dark customer theme) */
export const ZONE_STYLES: Record<ZoneColor, string> = {
  green:
    "bg-emerald-500/15 border-emerald-600/50 text-emerald-900 dark:border-emerald-400/50 dark:text-emerald-300",
  blue: "bg-sky-500/15 border-sky-600/50 text-sky-900 dark:border-sky-400/50 dark:text-sky-300",
  amber:
    "bg-amber-400/20 border-amber-600/50 text-amber-900 dark:border-amber-400/50 dark:text-amber-300",
  rose: "bg-rose-500/15 border-rose-600/50 text-rose-900 dark:border-rose-400/50 dark:text-rose-300",
  violet:
    "bg-violet-500/15 border-violet-600/50 text-violet-900 dark:border-violet-400/50 dark:text-violet-300",
  slate:
    "bg-slate-500/15 border-slate-600/50 text-slate-900 dark:border-slate-400/50 dark:text-slate-300",
}
export const ZONE_COLORS = Object.keys(ZONE_STYLES) as ZoneColor[]

/** How each object looks on the plan */
export function itemLook(item: FloorItem) {
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
