import { PlusIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ringColors } from "@/features/public/brand"
import {
  DEFAULT_BODY_FONT,
  DEFAULT_HEADING_FONT,
  FONTS,
  lookStyle,
  MAX_RING_COLORS,
} from "@/features/public/look"

const HEX = /^#[0-9a-f]{6}$/i

/** A strip showing the colours the rings blend through */
function Strip({ colors }: { colors: string[] }) {
  const stops = colors.length === 1 ? [colors[0], colors[0]] : colors
  return (
    <span
      aria-hidden
      className="block h-3 w-full rounded-full ring-1 ring-black/10"
      style={{ background: `linear-gradient(90deg, ${stops.join(", ")})` }}
    />
  )
}

/**
 * The colours of the rings behind the top of the page: up to four, blended from the middle out.
 * Empty means "made from the brand colour", which is what the strip shows then.
 */
export function RingColorsField({
  value,
  onChange,
  brand,
}: {
  value: string[]
  onChange: (colors: string[]) => void
  brand: string
}) {
  const { t } = useTranslation()
  const auto = ringColors(brand)
  const shown = value.length > 0 ? value : [auto.color, auto.colorTwo]
  const set = (i: number, color: string) =>
    onChange(value.map((c, n) => (n === i ? color : c)))

  return (
    <div className="space-y-3">
      <Label>{t("look.rings")}</Label>
      <Strip colors={shown.filter((c) => HEX.test(c))} />
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("look.ringsAuto")}</p>
      ) : (
        <ul className="space-y-2">
          {value.map((color, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="color"
                aria-label={t("look.ringColor", { n: i + 1 })}
                value={HEX.test(color) ? color : "#000000"}
                onChange={(e) => set(i, e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-md border bg-transparent"
              />
              <Input
                aria-label={t("look.ringColorHex", { n: i + 1 })}
                value={color}
                onChange={(e) => set(i, e.target.value.trim())}
                className="h-11 w-32 font-mono text-base lg:h-9 lg:text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={t("look.removeColor", { n: i + 1 })}
                onClick={() => onChange(value.filter((_, n) => n !== i))}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 lg:h-9"
          disabled={value.length >= MAX_RING_COLORS}
          onClick={() =>
            onChange([
              ...value,
              value.length === 0 ? auto.color : auto.colorTwo,
            ])
          }
        >
          <PlusIcon />
          {t("look.addColor")}
        </Button>
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 lg:h-9"
            onClick={() => onChange([])}
          >
            {t("look.useBrand")}
          </Button>
        )}
      </div>
    </div>
  )
}

/** A font picker (native list) with a line written in the chosen font */
export function FontField({
  id,
  label,
  value,
  onChange,
  kind,
}: {
  id: string
  label: string
  value: string
  onChange: (key: string) => void
  kind: "heading" | "body"
}) {
  const { t } = useTranslation()
  const fallback = kind === "heading" ? DEFAULT_HEADING_FONT : DEFAULT_BODY_FONT
  const current = value || fallback
  const options = FONTS.filter((f) => kind === "heading" || !f.headingOnly)
  const style = lookStyle(
    kind === "heading" ? { heading_font: current } : { body_font: current },
  )
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-base lg:h-9 lg:text-sm"
      >
        {options.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
            {f.key === fallback ? ` (${t("look.default")})` : ""}
          </option>
        ))}
      </select>
      {kind === "heading" ? (
        <p style={style} className="display-tight text-4xl">
          {t("look.sampleHeading")}
        </p>
      ) : (
        <p style={style} className="text-base">
          {t("look.sampleBody")}
        </p>
      )}
    </div>
  )
}
