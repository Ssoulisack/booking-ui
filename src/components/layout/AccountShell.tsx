import { Link, Outlet } from "react-router"
import { useTranslation } from "react-i18next"

import { usePublicBranch } from "@/hooks/use-public"
import { BranchSwitcher } from "@/components/public/booking/BranchSwitcher"
import { useCustomerMenu } from "@/components/public/booking/CustomerHeader"
import { readOriginSlug } from "@/components/public/booking/origin"
import { AppShell } from "@/components/layout/AppShell"

/**
 * /account/*: the customer's own area (My bookings, My packages, My account). It wears the same header and the same menu
 * as the branch page (one list, see useCustomerMenu): the header on a laptop, the bottom menu on a phone, where the pill
 * slides from one item to the next because it is one layout.
 */
export function AccountLayout() {
  // the branch the customer came from (null: from the list of all branches)
  const slug = readOriginSlug()
  const branch = usePublicBranch(slug ?? "", !!slug)
  const menu = useCustomerMenu(slug, branch.data)
  return (
    <AppShell
      gooey
      customer
      // the same left side as the branch page ("Company › Branch ▾"); the logo when there is no branch
      context={slug ? <BranchLeft slug={slug} /> : undefined}
      nav={menu.map((item) => ({
        id: item.id,
        to: item.to,
        label: item.label,
        icon: item.icon,
        here: item.here,
        end: true,
      }))}
    >
      <Outlet />
    </AppShell>
  )
}

/** The branch button on the left of the header, as on the branch page */
function BranchLeft({ slug }: { slug: string }) {
  const { t } = useTranslation()
  const branch = usePublicBranch(slug)
  if (branch.data) return <BranchSwitcher business={branch.data} />
  if (branch.isError)
    return (
      <Link to="/" className="font-semibold">
        {t("public.allBranches")}
      </Link>
    )
  return <span aria-hidden className="block h-11 w-40" />
}
