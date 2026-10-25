import { XIcon } from "lucide-react"
import { useEffect, useState, type RefObject } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import type { dayColorOf } from "./day-colors"

// the sticky top bar of the public pages (h-16 + its border)
const TOP_BAR = 65

/** true once the element has scrolled up and out of sight, under the top bar */
export function useScrolledPast(ref: RefObject<HTMLElement | null>) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const watch = new IntersectionObserver(
      ([e]) =>
        setPast(!e.isIntersecting && e.boundingClientRect.bottom < TOP_BAR),
      { rootMargin: `-${TOP_BAR}px 0px 0px 0px` },
    )
    watch.observe(el)
    return () => watch.disconnect()
  }, [ref])
  return past
}

/**
 * The chosen time kept at the top of the screen once its card has scrolled away, with Book and
 * Remove still in reach.
 */
export function PinnedBar({
  day,
  title,
  when,
  detail,
  bookLabel,
  onBook,
  onClear,
}: {
  day: ReturnType<typeof dayColorOf>
  title: string
  when: string
  detail: string
  bookLabel: string
  onBook: () => void
  onClear: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        background: day.bg,
        color: day.fg,
        boxShadow: `inset 0 -1px 0 ${day.ink}33`,
      }}
      className="fixed inset-x-0 top-[65px] z-20 animate-in border-b border-black/5 shadow-sm fade-in slide-in-from-top-2"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold opacity-80">{title}</p>
          <p className="truncate font-semibold tabular-nums">{when}</p>
          <p className="truncate text-sm opacity-80">{detail}</p>
        </div>
        <Button
          style={{ background: day.ink, color: "#ffffff" }}
          className="h-11 shrink-0 px-4 hover:opacity-90"
          onClick={onBook}
        >
          {bookLabel}
        </Button>
        <button
          type="button"
          aria-label={t("public.removeBooking")}
          onClick={onClear}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 focus-visible:ring-3 focus-visible:ring-black/30 focus-visible:outline-none"
        >
          <XIcon className="size-5" />
        </button>
      </div>
    </div>
  )
}
