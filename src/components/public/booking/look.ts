import type { CSSProperties } from "react"

/** The fonts a company can choose for its booking pages; bundled with the app (no outside calls) */
export interface FontChoice {
  key: string
  label: string
  /** CSS font-family of the first choice; Lao and Thai text falls back to Noto Sans Lao / Thai */
  family: string
  /** the condensed cut of Noto Sans: only for headings */
  stretch?: string
  headingOnly?: boolean
}

export const FONTS: FontChoice[] = [
  { key: "noto-sans", label: "Noto Sans", family: '"Noto Sans Variable"' },
  {
    key: "noto-condensed",
    label: "Noto Sans Condensed",
    family: '"Noto Sans Variable"',
    stretch: "62.5%",
    headingOnly: true,
  },
  { key: "inter", label: "Inter", family: '"Inter Variable"' },
  { key: "poppins", label: "Poppins", family: "Poppins" },
  { key: "kanit", label: "Kanit", family: "Kanit" },
  { key: "prompt", label: "Prompt", family: "Prompt" },
  { key: "sarabun", label: "Sarabun", family: "Sarabun" },
]

export const DEFAULT_HEADING_FONT = "noto-condensed"
export const DEFAULT_BODY_FONT = "noto-sans"
export const MAX_RING_COLORS = 4

const FALLBACK = '"Noto Sans Lao", "Noto Sans Thai", sans-serif'

/** The look of a company's or branch's pages: ring colours and the two fonts */
export interface Look {
  ring_colors?: string[]
  heading_font?: string
  body_font?: string
}

function fontOf(key: string | undefined, fallback: string): FontChoice {
  return (
    FONTS.find((f) => f.key === key) ??
    (FONTS.find((f) => f.key === fallback) as FontChoice)
  )
}

/** CSS for the chosen fonts: text inherits the body font; `display-tight` headings use the heading one */
export function lookStyle(look: Look | undefined): CSSProperties {
  const heading = fontOf(look?.heading_font, DEFAULT_HEADING_FONT)
  const body = fontOf(look?.body_font, DEFAULT_BODY_FONT)
  return {
    fontFamily: `${body.family}, ${FALLBACK}`,
    "--brand-heading-font": `${heading.family}, ${FALLBACK}`,
    "--brand-heading-stretch": heading.stretch ?? "100%",
  } as CSSProperties
}
