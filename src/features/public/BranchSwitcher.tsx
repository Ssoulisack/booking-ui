import {
  CheckIcon,
  ChevronDownIcon,
  LayoutGridIcon,
  MapPinIcon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { PublicBranch } from "@/lib/api/types"
import { useLiveBranches } from "@/features/places/api"

import { brandStyle } from "./brand"
import { BrandMark } from "./BrandMark"

/**
 * The top bar's "Company › Branch ▾": says which branch this page is and
 * opens a sheet to move to another branch or back to all branches.
 */
export function BranchSwitcher({ business }: { business: PublicBranch }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const branches = useLiveBranches()
  const others = (branches.data ?? []).filter((b) => b.slug !== business.slug)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t("public.switchBranch")}
          className="-ml-1.5 flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg px-1.5 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
        >
          <BrandMark
            name={business.company_name}
            logo={business.logo_url}
            className="size-9"
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-xs text-muted-foreground">
              {business.company_name} ›
            </span>
            <span className="flex items-center gap-1">
              <span className="truncate display-tight text-lg">
                {business.name}
              </span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
            </span>
          </span>
        </button>
      </SheetTrigger>
      {/* the sheet renders outside the page: give it the brand colours again */}
      <SheetContent
        side="bottom"
        style={brandStyle(business.brand_color, business)}
        className="max-h-[85dvh] rounded-t-2xl"
      >
        <SheetHeader>
          <SheetTitle>{t("public.switchBranch")}</SheetTitle>
          <SheetDescription>{business.company_name}</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 overflow-y-auto px-2 pb-6">
          <div className="flex min-h-14 items-center gap-3 rounded-xl bg-[var(--brand-soft)] px-3 text-[var(--brand-ink)]">
            <CheckIcon className="size-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {business.name}
              </span>
              <span className="block text-xs">{t("public.youAreHere")}</span>
            </span>
          </div>
          {others.map((b) => (
            <Link
              key={b.slug}
              to={`/b/${b.slug}`}
              onClick={() => setOpen(false)}
              className="flex min-h-14 items-center gap-3 rounded-xl px-3 hover:bg-muted"
            >
              <MapPinIcon className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{b.name}</span>
                {(b.province || b.address) && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {b.province ? t(`provinces.${b.province}`) : b.address}
                  </span>
                )}
              </span>
            </Link>
          ))}
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-black/10 px-3 font-medium hover:bg-muted"
          >
            <LayoutGridIcon className="size-5 shrink-0 text-muted-foreground" />
            {t("public.seeAllBranches")}
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
