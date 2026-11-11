import { cn } from "@/lib/utils"

/** The small red dot on My account: something to do there (add or verify the email) */
export function AttentionDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute size-2.5 rounded-full bg-red-500 ring-2 ring-background",
        className,
      )}
    />
  )
}
