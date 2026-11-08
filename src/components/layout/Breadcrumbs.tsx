import { ChevronRightIcon, HomeIcon } from "lucide-react"
import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { cn } from "@/lib/utils"

import type { Crumb } from "./crumbs"

/**
 * "🏠 Company › Branches › …": where this page sits. The first crumb is the area's home; the last
 * is this page (not a link). On phones only the home and the last two show.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useTranslation()
  if (items.length === 0) return null
  const last = items.length - 1

  return (
    <nav aria-label={t("breadcrumb.label")} className="mb-4">
      <ol className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
        {items.map((c, i) => {
          // phones: home, "…", and the last two
          const folded = i > 0 && i < last - 1
          return (
            <Fragment key={c.to}>
              {i === 1 && last > 2 && (
                <li aria-hidden className="flex items-center gap-1 sm:hidden">
                  <span>…</span>
                  <ChevronRightIcon className="size-3.5 shrink-0 opacity-60" />
                </li>
              )}
              <li
                className={cn(
                  "flex min-w-0 items-center gap-1",
                  folded && "hidden sm:flex",
                )}
              >
                {i === last ? (
                  <span
                    aria-current="page"
                    className="truncate font-medium text-foreground"
                  >
                    {c.label}
                  </span>
                ) : (
                  <Link
                    to={c.to}
                    className="inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-md px-1 hover:bg-muted hover:text-foreground"
                  >
                    {i === 0 && <HomeIcon className="size-4 shrink-0" />}
                    <span className="truncate">{c.label}</span>
                  </Link>
                )}
                {i < last && (
                  <ChevronRightIcon className="size-3.5 shrink-0 opacity-60" />
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
