import { useTranslation } from "react-i18next"

import { Label } from "@/components/ui/label"
import {
  DEFAULT_BODY_FONT,
  DEFAULT_HEADING_FONT,
  FONTS,
  lookStyle,
} from "@/components/public/booking/look"

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
