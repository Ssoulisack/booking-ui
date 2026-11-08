import { MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/** A small counter with − and + buttons (easier than typing or tiny arrows); it never leaves min..max */
export function Stepper({
  value,
  onChange,
  min = 1,
  max,
  icon,
  lessLabel,
  moreLabel,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  icon?: React.ReactNode
  lessLabel: string
  moreLabel: string
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl bg-card p-1.5 ring-1 ring-border">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="size-11"
        aria-label={lessLabel}
        disabled={value <= min}
        onClick={() => onChange(Math.max(value - 1, min))}
      >
        <MinusIcon />
      </Button>
      <span
        className="flex min-w-20 items-center justify-center gap-1.5 display-tight text-2xl tabular-nums"
        aria-live="polite"
      >
        {icon}
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="size-11"
        aria-label={moreLabel}
        disabled={max !== undefined && value >= max}
        onClick={() =>
          onChange(max === undefined ? value + 1 : Math.min(value + 1, max))
        }
      >
        <PlusIcon />
      </Button>
    </div>
  )
}
