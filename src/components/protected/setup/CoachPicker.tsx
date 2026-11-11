import { SearchIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { CoachAvatar } from "@/components/global/CoachAvatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCoachesList } from "@/hooks/use-coach"

/**
 * Coaches to include (a package, or a space where they come free): a tick box first ("Include coaches …"), and only
 * when it is ticked the coaches of the sport, with a search box when there are more than 5, 5 at a time ("See more")
 * and the ticked ones first. Unticked, nothing is included.
 */
export function CoachPicker({
  sportId,
  on,
  onToggle,
  value,
  onChange,
  label,
  hint,
}: {
  sportId: number
  /** the "include coaches" tick box */
  on: boolean
  onToggle: (on: boolean) => void
  /** the ticked coaches */
  value: number[]
  onChange: (ids: number[]) => void
  label: string
  hint: string
}) {
  const { t } = useTranslation()
  const coaches = useCoachesList().data ?? []
  const [search, setSearch] = useState("")
  const [shown, setShown] = useState(5)
  const sportCoaches = coaches.filter(
    (c) =>
      (c.active || value.includes(c.id)) &&
      c.sports.some((s) => s.id === sportId),
  )
  const ticked = value.filter((id) => sportCoaches.some((c) => c.id === id))
  const found = sportCoaches
    .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort(
      (a, b) => Number(ticked.includes(b.id)) - Number(ticked.includes(a.id)),
    )

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-4 accent-primary"
        />
        {label}
      </label>
      {on && (
        <>
          {sportCoaches.length > 5 && (
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label={t("packages.coachSearch")}
                placeholder={t("packages.coachSearch")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setShown(5)
                }}
                className="h-11 pl-9 text-base lg:h-9 lg:text-sm"
              />
            </div>
          )}
          {ticked.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("packages.coachesTicked", { count: ticked.length })}
            </p>
          )}
          {sportCoaches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("packages.noCoaches")}
            </p>
          ) : found.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("packages.noCoachFound")}
            </p>
          ) : (
            found.slice(0, shown).map((c) => (
              <label
                key={c.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={ticked.includes(c.id)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...ticked, c.id]
                        : ticked.filter((id) => id !== c.id),
                    )
                  }
                  className="size-4 accent-primary"
                />
                <CoachAvatar src={c.image_url} className="size-7" />
                {c.name}
              </label>
            ))
          )}
          {found.length > shown && (
            <Button
              type="button"
              variant="ghost"
              className="h-11 lg:h-9"
              onClick={() => setShown((n) => n + 5)}
            >
              {t("packages.seeMore", {
                count: Math.min(5, found.length - shown),
              })}
            </Button>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
