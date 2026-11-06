import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import type { PageMeta } from "@/lib/api/types"

export const PAGE_SIZES = [20, 50, 100] as const

/**
 * The one pager for every long list: First / Previous, "Page [3] of 50" (type a number and press Enter to jump),
 * Next / Last, how many rows are shown of the total, and (when onLimit is given) how many rows per page.
 * Hidden when everything fits on the smallest page.
 */
export function Pager({
  meta,
  page,
  onPage,
  limit,
  onLimit,
}: {
  meta: PageMeta | undefined
  page: number
  onPage: (page: number) => void
  /** rows per page now, and the way to change it (leave both out for a fixed page size) */
  limit?: number
  onLimit?: (limit: number) => void
}) {
  const { t } = useTranslation()
  const pages = meta?.total_page ?? 1
  const current = Math.min(Math.max(1, page), pages)
  const [text, setText] = useState(String(current))
  useEffect(() => setText(String(current)), [current])
  if (!meta || (pages <= 1 && (!onLimit || meta.total <= PAGE_SIZES[0])))
    return null

  const size = meta.limit || limit || PAGE_SIZES[0]
  const from = meta.total === 0 ? 0 : (current - 1) * size + 1
  const to = Math.min(meta.total, current * size)
  const jump = () => {
    const n = Math.round(Number(text))
    if (!Number.isFinite(n)) return setText(String(current))
    const target = Math.min(Math.max(1, n), pages)
    setText(String(target))
    if (target !== current) onPage(target)
  }
  const btn = "h-11 px-3 lg:h-9"

  return (
    <nav
      aria-label={t("pager.label")}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm"
    >
      <span className="text-muted-foreground tabular-nums">
        {t("pager.range", {
          from: from.toLocaleString(),
          to: to.toLocaleString(),
          total: meta.total.toLocaleString(),
        })}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          className={btn}
          disabled={current <= 1}
          onClick={() => onPage(1)}
          aria-label={t("pager.first")}
          title={t("pager.first")}
        >
          <ChevronsLeftIcon />
        </Button>
        <Button
          variant="outline"
          className={btn}
          disabled={current <= 1}
          onClick={() => onPage(current - 1)}
          aria-label={t("desk.previous")}
          title={t("desk.previous")}
        >
          <ChevronLeftIcon />
        </Button>
        <label className="flex items-center gap-1.5 px-1">
          <span className="sr-only">{t("pager.goTo")}</span>
          <input
            inputMode="numeric"
            value={text}
            onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={jump}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                jump()
              }
            }}
            aria-label={t("pager.goTo")}
            className="h-11 w-16 rounded-md border bg-background px-2 text-center tabular-nums lg:h-9"
          />
          <span className="whitespace-nowrap text-muted-foreground tabular-nums">
            {t("pager.of", { pages: pages.toLocaleString() })}
          </span>
        </label>
        <Button
          variant="outline"
          className={btn}
          disabled={current >= pages}
          onClick={() => onPage(current + 1)}
          aria-label={t("desk.next")}
          title={t("desk.next")}
        >
          <ChevronRightIcon />
        </Button>
        <Button
          variant="outline"
          className={btn}
          disabled={current >= pages}
          onClick={() => onPage(pages)}
          aria-label={t("pager.last")}
          title={t("pager.last")}
        >
          <ChevronsRightIcon />
        </Button>
      </div>
      {onLimit ? (
        <label className="flex items-center gap-2 text-muted-foreground">
          {t("pager.perPage")}
          <select
            value={size}
            onChange={(e) => onLimit(Number(e.target.value))}
            className="h-11 rounded-md border bg-background px-2 text-foreground lg:h-9"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span />
      )}
    </nav>
  )
}
