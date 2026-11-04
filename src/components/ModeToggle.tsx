import { MoonIcon, SunIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ColorMode } from "@/lib/color-mode"
import { cn } from "@/lib/utils"

/** Sun / moon: switches a dark / light store (customer site or back office) */
export function ModeToggle({
  store,
  className,
}: {
  store: { use: () => ColorMode; set: (m: ColorMode) => void }
  className?: string
}) {
  const { t } = useTranslation()
  const dark = store.use() === "dark"
  const label = dark ? t("public.theme.light") : t("public.theme.dark")
  return (
    <button
      type="button"
      onClick={() => store.set(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none lg:size-9",
        className,
      )}
    >
      {dark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
    </button>
  )
}
