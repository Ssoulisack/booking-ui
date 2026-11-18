import { colord, extend } from "colord"
import a11yPlugin from "colord/plugins/a11y"
import type { CSSProperties } from "react"

import { lookStyle, type Look } from "./look"

extend([a11yPlugin])

const INK = "#141a17"
const WHITE = "#ffffff"
/** The theme's navy: a company that has not chosen a colour gets the navy + candy look */
export const DEFAULT_BRAND = "#1c2350"

const NAVY = "#0e1330"
const CANDY_YELLOW = "#fbbf24"
const CANDY_INK = "#10142c"

/**
 * CSS variables for the app theme's brand colour. Buttons, selected states and highlights use --primary / --brand:
 * candy yellow (#fbbf24) with ink text, on light and dark pages alike. The brand used as text is darkened (light pages)
 * until it reads (WCAG AA). The hero keeps the navy (--brand-hero).
 */
export function brandStyle(
  look?: Look,
  mode: "light" | "dark" = "light",
): CSSProperties {
  // every page uses the app theme's colour (a company's own brand colour is no longer used)
  const real = colord(DEFAULT_BRAND)
  const page = mode === "dark" ? NAVY : WHITE
  // selected states, highlights and main buttons: candy yellow in both themes (the hero keeps the navy)
  const base = colord(CANDY_YELLOW)

  const onBrand =
    base.toHex() === CANDY_YELLOW
      ? CANDY_INK
      : base.contrast(WHITE) >= base.contrast(INK)
        ? WHITE
        : INK
  const onHero = real.contrast(WHITE) >= real.contrast(INK) ? WHITE : INK

  // brand as text on the page: darken (light) or lighten (dark) until it reaches 4.5:1
  let ink = base
  for (let i = 0; i < 20 && ink.contrast(page) < 4.5; i++)
    ink = mode === "dark" ? ink.lighten(0.04) : ink.darken(0.04)

  return {
    "--brand": base.toHex(),
    "--brand-foreground": onBrand,
    "--brand-ink": ink.toHex(),
    "--brand-soft": base.alpha(mode === "dark" ? 0.16 : 0.1).toRgbString(),
    "--brand-line": base.alpha(0.28).toRgbString(),
    "--brand-hero": real.toHex(),
    "--brand-hero-foreground": onHero,
    "--primary": base.toHex(),
    "--primary-foreground": onBrand,
    "--primary-ink": ink.toHex(),
    "--ring": base.alpha(0.5).toRgbString(),
    ...lookStyle(look),
  } as CSSProperties
}
