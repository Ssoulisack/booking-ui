import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

const STEPS = ["choose", "receive", "confirm", "password"] as const

/** Forgot password in 4 steps: choose phone or email → get the code / link → confirm it → new password */
export function ForgotSteps({ step }: { step: 1 | 2 | 3 | 4 }) {
  const { t } = useTranslation()
  return (
    <div className="mb-5 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">
        {t("forgotSteps.of", { step, count: STEPS.length })} ·{" "}
        {t(`forgotSteps.${STEPS[step - 1]}`)}
      </p>
      <ol className="grid grid-cols-4 gap-1.5" aria-hidden>
        {STEPS.map((key, i) => (
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
