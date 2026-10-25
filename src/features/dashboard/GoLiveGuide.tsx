import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface GuideStep {
  /** key under overview.guide.steps */
  id: "profile" | "sport" | "court" | "hoursPrice" | "publish"
  done: boolean
  /** where the step is done (relative to the branch); none for the last step */
  to?: string
  /** only the owner and admins can open the page */
  ownerOnly?: boolean
}

/** Step by step: what to click and what to enter to get the booking page live */
export function GoLiveGuide({
  steps,
  isOwner,
  open,
  onOpenChange,
}: {
  steps: GuideStep[]
  isOwner: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  // start at the first step still to do
  const firstTodo = Math.max(
    0,
    steps.findIndex((s) => !s.done),
  )
  const [at, setAt] = useState(firstTodo)
  const step = steps[at]
  const last = at === steps.length - 1
  const canOpen = !!step.to && (!step.ownerOnly || isOwner)
  const lines = t(`overview.guide.steps.${step.id}.lines`, {
    returnObjects: true,
  }) as string[]

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setAt(firstTodo)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("overview.guide.progress", { n: at + 1, total: steps.length })}
          </p>
          <DialogTitle>
            {t(`overview.guide.steps.${step.id}.title`)}
          </DialogTitle>
          <DialogDescription>
            {t(`overview.guide.steps.${step.id}.why`)}
          </DialogDescription>
        </DialogHeader>

        <ol className="flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full bg-muted",
                s.done && "bg-emerald-500",
                i === at && "bg-primary",
              )}
            />
          ))}
        </ol>

        {step.done && (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2Icon className="size-4 shrink-0" />
            {t("overview.guide.done")}
          </p>
        )}
        <ol className="list-decimal space-y-2 pl-5">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        {step.ownerOnly && !isOwner && (
          <p className="text-sm text-muted-foreground">
            {t("overview.guide.ownerOnly")}
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="h-11 lg:h-9"
            disabled={at === 0}
            onClick={() => setAt(at - 1)}
          >
            <ChevronLeftIcon />
            {t("overview.guide.back")}
          </Button>
          <div className="flex flex-wrap gap-2">
            {canOpen && (
              <Button asChild variant="outline" className="h-11 lg:h-9">
                <Link to={step.to!} onClick={() => onOpenChange(false)}>
                  {t("overview.guide.goThere")}
                </Link>
              </Button>
            )}
            {last ? (
              <Button
                type="button"
                className="h-11 lg:h-9"
                onClick={() => onOpenChange(false)}
              >
                {t("overview.guide.close")}
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11 lg:h-9"
                onClick={() => setAt(at + 1)}
              >
                {t("overview.guide.next")}
                <ChevronRightIcon />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
