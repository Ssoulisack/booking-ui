import {
  BanknoteIcon,
  CircleDotIcon,
  Disc3Icon,
  DoorOpenIcon,
  FootprintsIcon,
  MartiniIcon,
  MicVocalIcon,
  SquareDashedIcon,
  ToiletIcon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react"

import type {
  CutCorner,
  FloorItem,
  FloorItemKind,
  ZoneColor,
} from "@/types/floor-plan"
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
  cashier: BanknoteIcon,
  dj: Disc3Icon,
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
  orange:
    "bg-orange-500/15 border-orange-600/50 text-orange-900 dark:border-orange-400/50 dark:text-orange-300",
  black:
    "bg-stone-900/25 border-stone-900/70 text-stone-950 dark:bg-black/40 dark:border-white/40 dark:text-stone-100",
  teal: "bg-teal-500/15 border-teal-600/50 text-teal-900 dark:border-teal-400/50 dark:text-teal-300",
  lime: "bg-lime-500/20 border-lime-600/50 text-lime-900 dark:border-lime-400/50 dark:text-lime-300",
  brown:
    "bg-[#92400e]/15 border-[#92400e]/50 text-[#5c2a0b] dark:border-[#d6a06a]/50 dark:text-[#e0b98a]",
}
export const ZONE_COLORS = Object.keys(ZONE_STYLES) as ZoneColor[]

/** The same colours for an L zone, drawn as an outline: only the name's colour on the box, fill and stroke on the shape */
export const ZONE_TEXT: Record<ZoneColor, string> = {
  green: "text-emerald-900 dark:text-emerald-300",
  blue: "text-sky-900 dark:text-sky-300",
  amber: "text-amber-900 dark:text-amber-300",
  rose: "text-rose-900 dark:text-rose-300",
  violet: "text-violet-900 dark:text-violet-300",
  slate: "text-slate-900 dark:text-slate-300",
  orange: "text-orange-900 dark:text-orange-300",
  black: "text-stone-950 dark:text-stone-100",
  teal: "text-teal-900 dark:text-teal-300",
  lime: "text-lime-900 dark:text-lime-300",
  brown: "text-[#5c2a0b] dark:text-[#e0b98a]",
}
export const ZONE_SVG: Record<ZoneColor, string> = {
  green: "fill-emerald-500/15 stroke-emerald-600/50 dark:stroke-emerald-400/50",
  blue: "fill-sky-500/15 stroke-sky-600/50 dark:stroke-sky-400/50",
  amber: "fill-amber-400/20 stroke-amber-600/50 dark:stroke-amber-400/50",
  rose: "fill-rose-500/15 stroke-rose-600/50 dark:stroke-rose-400/50",
  violet: "fill-violet-500/15 stroke-violet-600/50 dark:stroke-violet-400/50",
  slate: "fill-slate-500/15 stroke-slate-600/50 dark:stroke-slate-400/50",
  orange: "fill-orange-500/15 stroke-orange-600/50 dark:stroke-orange-400/50",
  black:
    "fill-stone-900/25 stroke-stone-900/70 dark:fill-black/40 dark:stroke-white/40",
  teal: "fill-teal-500/15 stroke-teal-600/50 dark:stroke-teal-400/50",
  lime: "fill-lime-500/20 stroke-lime-600/50 dark:stroke-lime-400/50",
  brown: "fill-[#92400e]/15 stroke-[#92400e]/50 dark:stroke-[#d6a06a]/50",
}

/** Whether a zone is drawn as an outline (an L) and not as a box */
export const isLZone = (item: FloorItem) =>
  item.kind === "zone" && item.shape === "l" && item.cut_w > 0 && item.cut_h > 0

/** Where the name of an L zone goes: in the corner opposite the cut-out, which is always part of the L */
const L_LABEL: Record<CutCorner, string> = {
  tl: "items-end justify-end",
  tr: "items-end justify-start",
  bl: "items-start justify-end",
  br: "items-start justify-start",
}

/** How each object looks on the plan */
export function itemLook(item: FloorItem) {
  switch (item.kind) {
    case "zone": {
      const color = (item.color || "green") as ZoneColor
      // an L is drawn by ZoneOutline: the box itself has no border or fill, and lets clicks through to the shape
      if (isLZone(item))
        return cn(
          "pointer-events-none border-0 p-1",
          L_LABEL[item.cut_corner],
          ZONE_TEXT[color],
        )
      return cn(
        "border-2 border-dashed",
        item.shape === "round"
          ? "items-center justify-center rounded-[50%] p-1"
          : "items-start justify-start p-1",
        ZONE_STYLES[color],
      )
    }
    case "bar":
      return "rounded-md bg-stone-700 text-white border-stone-800"
    case "pole":
      return "pointer-events-none rounded-full border-2 border-dashed border-stone-500 bg-stone-300/70 text-stone-800"
    case "stage":
      return "rounded-md bg-violet-200 text-violet-950 border-violet-400"
    case "toilet":
      return "rounded-md bg-sky-100 text-sky-950 border-sky-300"
    case "entry":
      return "rounded-md border-dashed border-foreground/40 bg-background/70"
    case "label":
      return "border-transparent bg-transparent"
    case "cashier":
      return "rounded-md bg-emerald-100 text-emerald-950 border-emerald-400"
    case "dj":
      return "rounded-md bg-fuchsia-200 text-fuchsia-950 border-fuchsia-400"
    case "stairs":
      // steps: light and dark stripes across the stairs
      return "rounded-sm border-stone-500 text-stone-900 bg-[repeating-linear-gradient(0deg,var(--color-stone-200)_0_6px,var(--color-stone-400)_6px_8px)]"
  }
}
