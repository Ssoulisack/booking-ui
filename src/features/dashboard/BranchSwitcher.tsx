import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usableBranches, useMyBranches } from "@/features/auth/api"
import type { MyBranch } from "@/lib/api/types"

/** The current branch; a menu to switch when the person works at several */
export function BranchSwitcher({ current }: { current: MyBranch }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const branches = usableBranches(useMyBranches().data)

  const label = (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium">{current.name}</span>
      <Badge variant="secondary" className="hidden sm:inline-flex">
        {t(`roles.${current.role}`)}
      </Badge>
    </span>
  )

  if (branches.length < 2) {
    return <div className="flex h-11 items-center px-2">{label}</div>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 max-w-full justify-start gap-2 px-2 lg:h-9"
          aria-label={t("switcher.choose")}
        >
          {label}
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t("switcher.choose")}</DropdownMenuLabel>
        {branches.map((b) => (
          <DropdownMenuItem
            key={b.branch_id}
            className="h-11 lg:h-9"
            onSelect={() => navigate(`/dashboard/${b.branch_id}`)}
          >
            <span className="flex-1 truncate">{b.name}</span>
            <span className="text-xs text-muted-foreground">
              {t(`roles.${b.role}`)}
            </span>
            {b.branch_id === current.branch_id && <CheckIcon />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
