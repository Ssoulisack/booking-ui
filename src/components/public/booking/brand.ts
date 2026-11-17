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
 * CSS variables for the app theme's brand colour (navy, candy yellow on the night theme). Buttons and selected states use --primary, so
 * shadcn components follow the brand. Text on the brand is white or ink, whichever reads better;
 * the brand used as text is darkened (light pages) or lightened (dark pages) until it reads
 * (WCAG AA). On the navy night theme a brand too dark to see gives its buttons to candy yellow;
 * the hero keeps the real brand colour (--brand-hero).
 */
export function brandStyle(
  look?: Look,
  mode: "light" | "dark" = "light",
): CSSProperties {
  // every page uses the app theme's colour (a company's own brand colour is no longer used)
  const real = colord(DEFAULT_BRAND)
  const page = mode === "dark" ? NAVY : WHITE
  const base =
    mode === "dark" && real.contrast(NAVY) < 3 ? colord(CANDY_YELLOW) : real

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
