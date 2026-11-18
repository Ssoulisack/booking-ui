import {
  BriefcaseIcon,
  LogOutIcon,
  Building2Icon,
  LayoutGridIcon,
  TicketIcon,
  UserRoundIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { AttentionDot } from "@/components/global/AttentionDot"
import { needsEmail } from "@/lib/account-email"
import { Link, useNavigate } from "react-router"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usableBranches, useMyBranches } from "@/hooks/use-auth"
import { runsCompany, useSession } from "@/stores/session"
import { adminUrlOf, IS_ADMIN, isAdminPath, webUrlOf } from "@/lib/site"

/** A link in the menu: inside this site with the router, to the other site (website ↔ backoffice) as a full address */
// the menu item (asChild) hands its class, ref and keyboard props to this link: pass them all on
function MenuLink({
  to,
  ref,
  ...rest
}: { to: string } & React.ComponentPropsWithRef<"a">) {
  const backoffice = isAdminPath(to) || (IS_ADMIN && to === "/account/profile")
  if (backoffice === IS_ADMIN) return <Link ref={ref} to={to} {...rest} />
  return (
    <a ref={ref} href={backoffice ? adminUrlOf(to) : webUrlOf(to)} {...rest} />
  )
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?"

/** Avatar menu: the areas this person can open, and log out */
export function UserMenu({ allBranches = false }: { allBranches?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const signOut = useSession((s) => s.signOut)
  const branches = useMyBranches()

  const hasDashboard = usableBranches(branches.data).length > 0

  if (!user) {
    return (
      <Button asChild variant="outline">
        <Link to="/login">{t("actions.logIn")}</Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="rounded-full"
          aria-label={t("nav.account")}
        >
          <span className="relative">
            <Avatar>
              {user.avatar && <AvatarImage src={user.avatar} alt="" />}
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            {needsEmail(user) && <AttentionDot className="top-0 right-0" />}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate font-medium text-foreground">
            {user.name}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {user.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {runsCompany(user) && (
          <DropdownMenuItem asChild>
            <MenuLink to="/company">
              <Building2Icon />
              {t("nav.company")}
            </MenuLink>
          </DropdownMenuItem>
        )}
        {hasDashboard && (
          <DropdownMenuItem asChild>
            <MenuLink to="/dashboard">
              <BriefcaseIcon />
              {t("nav.dashboard")}
            </MenuLink>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <MenuLink to="/account">
            <TicketIcon />
            {t("nav.myBookings")}
          </MenuLink>
        </DropdownMenuItem>
        {allBranches && !IS_ADMIN && (
          <DropdownMenuItem asChild>
            <Link to="/">
              <LayoutGridIcon />
              {t("public.allBranches")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <MenuLink to="/account/profile">
            <UserRoundIcon />
            {t("nav.account")}
            {needsEmail(user) && (
              <span
                aria-label={t("emailVerify.dotLabel")}
                className="ml-auto size-2.5 rounded-full bg-red-500"
              />
            )}
          </MenuLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut()
            navigate("/login", { replace: true })
          }}
        >
          <LogOutIcon />
          {t("actions.logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
