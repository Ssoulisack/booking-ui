import { colord, extend } from "colord"
import a11yPlugin from "colord/plugins/a11y"
import type { CSSProperties } from "react"

extend([a11yPlugin])

const INK = "#141a17"
const WHITE = "#ffffff"
export const DEFAULT_BRAND = "#0e7c66"

/**
 * CSS variables for one business's brand colour. Buttons and selected states use --primary, so
 * shadcn components follow the brand. Text on the brand is white or ink, whichever reads better;
 * a pale brand colour is darkened for links and text on white so it stays readable (WCAG AA).
 */
export function brandStyle(hex: string | undefined): CSSProperties {
  const base = colord(hex || DEFAULT_BRAND).isValid()
    ? colord(hex || DEFAULT_BRAND)
    : colord(DEFAULT_BRAND)

  const onBrand = base.contrast(WHITE) >= base.contrast(INK) ? WHITE : INK

  // brand as text on white: darken until it reaches 4.5:1
  let ink = base
  for (let i = 0; i < 20 && ink.contrast(WHITE) < 4.5; i++)
    ink = ink.darken(0.04)

  return {
    "--brand": base.toHex(),
    "--brand-foreground": onBrand,
    "--brand-ink": ink.toHex(),
    "--brand-soft": base.alpha(0.1).toRgbString(),
    "--brand-line": base.alpha(0.28).toRgbString(),
    "--primary": base.toHex(),
    "--primary-foreground": onBrand,
    "--ring": base.alpha(0.5).toRgbString(),
  } as CSSProperties
}

/**
 * Colours for the MagicRings behind the hero, which sits on the brand colour itself: a dark brand
 * gets glowing lighter tints ("dark" theme), a pale brand gets deeper shades ("light" theme), so
 * the rings always show against the background.
 */
export function ringColors(hex: string | undefined): {
  color: string
  colorTwo: string
  theme: "dark" | "light"
} {
  const base = colord(hex || DEFAULT_BRAND).isValid()
    ? colord(hex || DEFAULT_BRAND)
    : colord(DEFAULT_BRAND)
  const darkBrand = base.contrast(WHITE) >= base.contrast(INK)
  return darkBrand
    ? {
        color: base.lighten(0.3).toHex(),
        colorTwo: base.lighten(0.5).toHex(),
        theme: "dark",
      }
    : {
        color: base.darken(0.45).toHex(),
        colorTwo: base.darken(0.6).toHex(),
        theme: "light",
      }
}
