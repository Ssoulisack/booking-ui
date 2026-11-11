import {
  ArrowLeftIcon,
  CalendarCheckIcon,
  MenuIcon,
  PackageIcon,
  type LucideIcon,
} from "lucide-react"
import { UnsavedGuard } from "@/components/global/UnsavedGuard"
import { motion, MotionConfig } from "motion/react"
import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link, NavLink, useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { MobileNav } from "@/components/public/booking/MobileNav"

import { AreaSwitch, AreaTag } from "./area"
import { usePreviousArea, type Area } from "./area-state"
import { ModeToggle } from "@/components/global/ModeToggle"
import { usePublicCompany } from "@/hooks/use-place"
import { CustomerTheme } from "@/components/public/booking/CustomerTheme"
import { ThemeToggle } from "@/components/public/booking/ThemeToggle"
import { dashMode, useHtmlMode } from "@/lib/color-mode"
import { Breadcrumbs } from "./Breadcrumbs"
import type { Crumb } from "@/lib/breadcrumbs"
import { UserMenu } from "./UserMenu"
import { CustomerHeader } from "@/components/public/booking/CustomerHeader"
import { LanguageToggle } from "@/components/global/LanguageToggle"

export interface NavItem {
  /** the same id as the matching item of the customer menu on other pages (see MobileNav) */
  id?: string
  /** a customer menu item whose page is open (the customer header highlights it) */
  here?: boolean
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  // a number to notice on the item, e.g. bookings waiting for approval (hidden at 0)
  badge?: number
}

interface AppShellProps {
  nav: NavItem[]
  // shown next to the logo, e.g. the branch switcher
  context?: ReactNode
  // a full-width notice under the top bar
  banner?: ReactNode
  // company (deep indigo menu) or branch dashboard (light menu, green marks); none for My account
  area?: Area
  // the owner and admins choose Company or Branch above the menu
  areaSwitch?: boolean
  crumbs?: Crumb[]
  // tablets and phones get the Gooey Nav at the bottom instead of the side sheet (customer pages)
  gooey?: boolean
  // a customer page (My bookings, My account): the customer theme and its dark / light switch,
  // not the back office's
  customer?: boolean
  // top left: an arrow back to where the person came from, instead of the logo (customer pages)
  back?: { to: string; label: string }
  children: ReactNode
}

// the menu's background per area, also used to fade from the previous area
const MENU_BG: Record<Area, string> = {
  company: "bg-[var(--area-company-menu)] text-white",
  branch: "bg-background",
}

/**
 * Company, dashboard and account areas: a top bar everywhere, the menu in a side sheet on
 * phones and tablets, and a fixed sidebar from laptop width up. Moving between Company and a
 * branch fades the menu colour over and slides the new menu and page in.
 */
export function AppShell({
  nav,
  context,
  banner,
  area,
  areaSwitch,
  crumbs,
  gooey,
  customer,
  back,
  children,
}: AppShellProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const from = usePreviousArea(area)
  // the back office's own dark / light choice (light by default)
  useHtmlMode(dashMode.use(), [], !customer)
  // company sits left of branch in the switch: slide in from that side
  const dir = area === "company" ? -1 : 1

  const menu = (onNavigate?: () => void) => (
    <>
      {area && areaSwitch && <AreaSwitch area={area} onNavigate={onNavigate} />}
      <NavList
        items={nav}
        area={area}
        animate={from !== undefined}
        onNavigate={onNavigate}
      />
    </>
  )

  return (
    <MotionConfig reducedMotion="user">
      <UnsavedGuard />
      <Frame customer={customer}>
        {customer && gooey ? (
          // the one customer header: the same bar as the branch page
          <CustomerHeader
            left={
              context ?? (
                <Link
                  to="/"
                  className="flex shrink-0 items-center gap-2 font-semibold"
                >
                  <CalendarCheckIcon className="size-5 text-[var(--primary-ink)]" />
                  <span>{t("app.name")}</span>
                </Link>
              )
            }
            items={nav.map((item) => ({
              id: item.id ?? item.to,
              to: item.to,
              label: item.label,
              icon: item.icon,
              here: !!item.here,
            }))}
          />
        ) : (
          <header
            className={cn(
              "sticky top-0 z-30 flex h-14 items-center gap-2 bg-background px-3 sm:px-4",
              customer ? "pub-rainbow" : "border-b",
            )}
          >
            {area && (
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 top-0 h-[3px] transition-colors duration-500",
                  area === "company"
                    ? "bg-[var(--area-company)]"
                    : "bg-[var(--area-branch)]",
                )}
              />
            )}
            {nav.length > 0 && !gooey && (
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="relative lg:hidden"
                    aria-label={t("nav.menu")}
                  >
                    <MenuIcon />
                    {/* something waits (e.g. bookings to approve): seen without opening the menu */}
                    {nav.some((n) => n.badge) && (
                      <span
                        aria-hidden
                        className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-red-600 ring-2 ring-background"
                      />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className={cn("w-72 p-0", area && MENU_BG[area])}
                >
                  <SheetHeader
                    className={cn(
                      "border-b",
                      area === "company" && "border-white/10",
                    )}
                  >
                    <SheetTitle
                      className={cn(area === "company" && "text-white")}
                    >
                      {t("app.name")}
                    </SheetTitle>
                  </SheetHeader>
                  {menu(() => setOpen(false))}
                </SheetContent>
              </Sheet>
            )}
            {back ? (
              <Link
                to={back.to}
                aria-label={t("nav.backTo", { name: back.label })}
                className="flex h-11 min-w-0 shrink items-center gap-2 rounded-lg px-2 font-semibold hover:bg-muted"
              >
                <ArrowLeftIcon className="size-5 shrink-0" />
                <span className="truncate">{back.label}</span>
              </Link>
            ) : (
              <Link
                to="/"
                className="flex shrink-0 items-center gap-2 font-semibold"
              >
                <CalendarCheckIcon className="size-5 text-[var(--primary-ink)]" />
                <span className="hidden sm:inline">{t("app.name")}</span>
              </Link>
            )}
            {area && <AreaTag area={area} />}
            <div className="min-w-0 flex-1">{context}</div>
            <LanguageToggle />
            {customer ? <ThemeToggle /> : <ModeToggle store={dashMode} />}
            <UserMenu allBranches={!!back} />
          </header>
        )}
        {banner}
        <div className="lg:flex">
          {nav.length > 0 && !(customer && gooey) && (
            <aside
              className={cn(
                "sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-hidden border-r lg:block",
                area ? MENU_BG[area] : "bg-background",
                area === "company" && "border-transparent",
              )}
            >
              {/* the previous area's colour fades away: the switch reads as one change */}
              {from && (
                <motion.div
                  aria-hidden
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className={cn(
                    "pointer-events-none absolute inset-0",
                    MENU_BG[from],
                  )}
                />
              )}
              <div className="relative">{menu()}</div>
            </aside>
          )}
          <main
            className={cn(
              "mx-auto w-full min-w-0 px-4 py-6",
              customer ? "max-w-5xl" : "max-w-6xl sm:px-6",
              gooey && "pb-28 lg:pb-6",
            )}
          >
            <motion.div
              initial={from ? { opacity: 0, x: 28 * -dir } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {crumbs && <Breadcrumbs items={crumbs} />}
              {children}
            </motion.div>
          </main>
        </div>
        {gooey && <AccountNav nav={nav} />}
      </Frame>
    </MotionConfig>
  )
}

/** The page's outer box: a customer page wears the customer theme, the back office its plain background */
function Frame({
  customer,
  children,
}: {
  customer?: boolean
  children: ReactNode
}) {
  return customer ? (
    <CustomerTheme>{children}</CustomerTheme>
  ) : (
    <div className="min-h-dvh bg-muted/30">{children}</div>
  )
}

function NavList({
  items,
  area,
  animate,
  onNavigate,
}: {
  items: NavItem[]
  area?: Area
  animate: boolean
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map(({ to, label, icon: Icon, end, badge }, i) => (
        <motion.div
          key={to}
          initial={animate ? { opacity: 0, x: -12 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 + i * 0.035, duration: 0.25 }}
        >
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors lg:h-9",
                area === "company"
                  ? "text-white/70 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isActive &&
                  (area === "company"
                    ? "bg-white/15 text-white before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-full before:bg-[var(--area-company-glow)]"
                    : area === "branch"
                      ? "bg-[var(--area-branch-soft)] text-[var(--area-branch-ink)] before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-full before:bg-[var(--area-company-glow)] hover:bg-[var(--area-branch-soft)] hover:text-[var(--area-branch-ink)]"
                      : "bg-muted text-foreground"),
              )
            }
          >
            <Icon className="size-4" />
            {label}
            {badge ? (
              <span
                aria-label={t("nav.pending", { count: badge })}
                className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs leading-5 font-semibold text-white tabular-nums"
              >
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </NavLink>
        </motion.div>
      ))}
    </nav>
  )
}

/** The nav items as the Gooey Nav: the longest address that matches this page is the active one */
function AccountNav({ nav: menu }: { nav: NavItem[] }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const color = usePublicCompany().data?.brand_color
  const navigate = useNavigate()
  // the same menu as the branch page: My bookings, My packages | the round Booking button | Packages for sale, My account (Policy
  // stays in the laptop header only)
  const booking = menu.find((i) => i.id === "booking")
  const by = (id: string) => menu.filter((i) => i.id === id)
  const nav: NavItem[] = booking
    ? [
        ...by("bookings"),
        ...by("packages"),
        booking,
        // packages for sale: the branch page's Package tab (sport branches, where My packages is in the menu)
        ...(by("packages").length > 0 && booking.to !== "/home"
          ? [
              {
                id: "sale",
                to: booking.to.replace("#book", "#packages"),
                label: t("public.tabs.package"),
                icon: PackageIcon,
              },
            ]
          : []),
        ...by("account"),
      ]
    : menu
  let active = 0
  let best = -1
  nav.forEach((item, i) => {
    const hit = item.end
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (hit && item.to.length > best) {
      best = item.to.length
      active = i
    }
  })
  return (
    <MobileNav
      themed
      color={color}
      active={active}
      items={nav.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        // icons only, also on the open item (its name stays as the accessible name)
        iconOnly: nav.length > 2,
        center: item.id === "booking",
        onSelect: () => navigate(item.to),
      }))}
    />
  )
}
