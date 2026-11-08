import { CheckIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Flag } from "@/components/global/flags"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { chooseLanguage, LANGUAGES, type Language } from "@/i18n"
import { cn } from "@/lib/utils"

/** Each language in its own words, so people find theirs whatever language the page is in */
const NAMES: Record<Language, string> = { en: "English", lo: "ລາວ", th: "ไทย" }

/** The flag of the page language in the top bar: tap to pick another language (remembered on this device; it wins over the company's language) */
export function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation()
  const current = LANGUAGES.includes(i18n.resolvedLanguage as Language)
    ? (i18n.resolvedLanguage as Language)
    : "en"
  const label = t("settings.language")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none lg:size-9",
            className,
          )}
        >
          <Flag language={current} className="h-[18px] w-[26px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l}
            lang={l}
            className="gap-2"
            onSelect={() => chooseLanguage(l)}
          >
            <CheckIcon className={cn("size-4", l !== current && "invisible")} />
            <Flag language={l} />
            {NAMES[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
