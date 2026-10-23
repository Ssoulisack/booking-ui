import { formatInTimeZone } from "date-fns-tz"

/** One weekday's colour, in a soft tone: pale fill, dark text on it, and a strong shade for buttons */
export interface DayColor {
  bg: string
  fg: string
  ink: string
}

// The traditional colours of the week in Laos and Thailand, Sunday first, kept pale and quiet.
const COLORS: DayColor[] = [
  { bg: "#fee2e2", fg: "#7f1d1d", ink: "#b91c1c" }, // Sunday: red
  { bg: "#fef9c3", fg: "#713f12", ink: "#a16207" }, // Monday: yellow
  { bg: "#fce7f3", fg: "#831843", ink: "#be185d" }, // Tuesday: pink
  { bg: "#dcfce7", fg: "#14532d", ink: "#15803d" }, // Wednesday: green
  { bg: "#ffedd5", fg: "#7c2d12", ink: "#c2410c" }, // Thursday: orange
  { bg: "#e0f2fe", fg: "#0c4a6e", ink: "#0369a1" }, // Friday: light blue
  { bg: "#f3e8ff", fg: "#581c87", ink: "#7e22ce" }, // Saturday: purple
]

/** The colour of the weekday an instant falls on in the business time zone */
export function dayColorOf(iso: string, tz: string): DayColor {
  // ISO weekday: Monday 1 … Sunday 7
  return COLORS[Number(formatInTimeZone(iso, tz, "i")) % 7]
}
