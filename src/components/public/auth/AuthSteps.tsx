import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

/** "Step 2 of 3 · Code" and a bar per step, for the step-by-step auth pages (register, forgot password by phone) */
export function AuthSteps({
  step,
  labels,
}: {
  step: number
  /** translation keys, one per step */
  labels: string[]
}) {
  const { t } = useTranslation()
  return (
    <div className="mb-5 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">
        {t("forgotSteps.of", { step, count: labels.length })} ·{" "}
        {t(labels[step - 1])}
      </p>
      <ol
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}
        aria-hidden
      >
        {labels.map((key, i) => (
          <li
            key={key}
            className={cn(
              "h-1.5 rounded-full",
              i < step ? "bg-[var(--brand)]" : "bg-muted",
            )}
          />
        ))}
      </ol>
    </div>
  )
}
