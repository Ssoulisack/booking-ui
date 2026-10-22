import { CalendarCheckIcon, MenuIcon, type LucideIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link, NavLink } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { UserMenu } from "./UserMenu"

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface AppShellProps {
  nav: NavItem[]
  // shown next to the logo, e.g. the business switcher
  context?: ReactNode
  // a full-width notice under the top bar, e.g. the support view
  banner?: ReactNode
  children: ReactNode
}

/**
 * Admin, dashboard and account areas: a top bar everywhere, the menu in a side sheet on
 * phones and tablets, and a fixed sidebar from laptop width up.
 */
export function AppShell({ nav, context, banner, children }: AppShellProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-3 sm:px-4">
        {nav.length > 0 && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="lg:hidden"
                aria-label={t("nav.menu")}
              >
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b">
                <SheetTitle>{t("app.name")}</SheetTitle>
              </SheetHeader>
              <NavList items={nav} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        )}
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <CalendarCheckIcon className="size-5 text-primary" />
          <span className="hidden sm:inline">{t("app.name")}</span>
        </Link>
        <div className="min-w-0 flex-1">{context}</div>
        <UserMenu />
      </header>
      {banner}
      <div className="lg:flex">
        {nav.length > 0 && (
          <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 border-r bg-background lg:block">
            <NavList items={nav} />
          </aside>
        )}
        <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavList({
  items,
  onNavigate,
}: {
  items: NavItem[]
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:h-9",
              isActive && "bg-muted text-foreground",
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
