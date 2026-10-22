import { useTranslation } from "react-i18next"

import { countryOptions } from "@/lib/countries"
import { cn } from "@/lib/utils"

/**
 * Nationality as a native list (the phone's own picker suits 250 countries), Laos and its
 * neighbours first. Values are ISO codes such as "LA".
 */
export function NationalitySelect({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string
  value: string
  onChange: (code: string) => void
  invalid?: boolean
}) {
  const { t, i18n } = useTranslation()
  const { first, rest } = countryOptions(i18n.language)
  return (
    <select
      id={id}
      value={value}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive lg:h-9 lg:text-sm",
        !value && "text-muted-foreground",
      )}
    >
      <option value="" disabled>
        {t("identity.chooseNationality")}
      </option>
      {first.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
      <option disabled>──────────</option>
      {rest.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  )
}
