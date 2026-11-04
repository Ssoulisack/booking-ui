import type { ReactNode } from "react"

import { usePublicCompany } from "@/features/places/api"
import { cn } from "@/lib/utils"

import { brandStyle, DEFAULT_BRAND } from "./brand"
import { useBrandOnPage, usePublicTheme } from "./theme"

/**
 * The customer look (dark / light with candy accents, the company's brand colour) for pages that
 * are not a branch page: login, register, My bookings, My account, privacy. Branch pages do the same
 * in their own layout.
 */
export function CustomerTheme({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const mode = usePublicTheme()
  const company = usePublicCompany().data
  const brand = brandStyle(company?.brand_color ?? DEFAULT_BRAND, company, mode)
  useBrandOnPage(brand)
  return (
    <div
      style={brand}
      className={cn("min-h-dvh bg-background text-foreground", className)}
    >
      {children}
    </div>
  )
}
