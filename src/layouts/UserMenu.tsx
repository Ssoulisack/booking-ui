import {
  BriefcaseIcon,
  LogOutIcon,
  Building2Icon,
  TicketIcon,
  UserRoundIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
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
import { usableBranches, useMyBranches } from "@/features/auth/api"
import { runsCompany, useSession } from "@/stores/session"

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?"

/** Avatar menu: the areas this person can open, and log out */
export function UserMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const signOut = useSession((s) => s.signOut)
  const branches = useMyBranches()

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
          <Avatar>
            {user.avatar && <AvatarImage src={user.avatar} alt="" />}
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
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
            <Link to="/company">
              <Building2Icon />
              {t("nav.company")}
            </Link>
          </DropdownMenuItem>
        )}
        {usableBranches(branches.data).length > 0 && (
          <DropdownMenuItem asChild>
            <Link to="/dashboard">
              <BriefcaseIcon />
              {t("nav.dashboard")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/account">
            <TicketIcon />
            {t("nav.myBookings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/profile">
            <UserRoundIcon />
            {t("nav.account")}
          </Link>
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
