import { useQueryClient } from "@tanstack/react-query"
import { HistoryIcon, RotateCwIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"

import { ErrorAlert } from "@/components/global/form"
import { PageError, PageTitle } from "@/components/global/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  packageKeys,
  useCancelMyPackage,
  useMyPackageVisits,
  useMyPackages,
} from "@/hooks/use-account"
import {
  useBuyPackage,
  usePublicBranch,
  usePublicPackages,
} from "@/hooks/use-public"
import { AskToApprove } from "@/components/public/booking/AskToApprove"
import { PackageBuySummary } from "@/components/public/booking/PackageBuySummary"
import { selectionQuery } from "@/components/public/booking/selection"
import type { CustomerPackage } from "@/types/package"
import { dayIn, money } from "@/lib/format"
import {
  coversLabel,
  leftLabel,
  optionLabel,
  ymdLabel,
  statusLabel,
} from "@/lib/packages"
import { cn } from "@/lib/utils"

type Tab = "current" | "waiting" | "finished"
const TABS: Tab[] = ["current", "waiting", "finished"]

/**
 * /account/packages — every package the customer bought, at every branch, in three tabs (kept in the address,
 * ?tab=): Current (active: how much is left, book), Waiting for approval (not active yet: pay, or the slip the team is
 * checking) and Finished (used up, out of time, cancelled: buy again, history).
 */
export function MyPackagesPage() {
  const { t } = useTranslation()
  const mine = useMyPackages()
  const [logOf, setLogOf] = useState<CustomerPackage | null>(null)
  const [params, setParams] = useSearchParams()
  const list = mine.data ?? []
  const groups: Record<Tab, CustomerPackage[]> = {
    current: list.filter((p) => p.status === "active"),
    waiting: list.filter((p) => p.status === "pending_payment"),
    finished: list.filter(
      (p) => p.status !== "active" && p.status !== "pending_payment",
    ),
  }
  const wanted = params.get("tab")
  const tab: Tab = TABS.includes(wanted as Tab) ? (wanted as Tab) : "current"

  return (
    <div className="space-y-6">
      <PageTitle title={t("packages.my.title")} />
      {mine.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : mine.isError ? (
        <PageError error={mine.error} onRetry={() => mine.refetch()} />
      ) : list.length === 0 ? (
        <p className="rounded-xl bg-card p-6 text-muted-foreground ring-1 ring-border">
          {t("packages.my.none")}
        </p>
      ) : (
        <Tabs
          value={tab}
          onValueChange={(v) =>
            setParams(v === "current" ? {} : { tab: v }, { replace: true })
          }
          className="space-y-4"
        >
          {/* three tabs share a phone's width; each says how many it holds. The list is h-8 by default (a rule only the same-named rule can replace): h-12 holds the h-10 tabs */}
          <TabsList className="grid w-full grid-cols-3 group-data-horizontal/tabs:h-12 sm:inline-flex sm:w-fit">
            {TABS.map((k) => (
              <TabsTrigger
                key={k}
                value={k} // the open tab: #FBB828 with black text, also under the mouse (never white); the others turn #FBB828, not white,
                // on hover in dark mode
                className="h-10 px-2 sm:px-4 dark:hover:text-[#FBB828] data-active:border-transparent data-active:bg-[#FBB828] data-active:text-black data-active:shadow-none data-active:hover:text-black dark:data-active:border-transparent dark:data-active:bg-[#FBB828] dark:data-active:text-black dark:data-active:hover:text-black"
              >
                {/* a phone gets the short words ("Waiting"), wider screens the full ones */}
                <span className="truncate sm:hidden">
                  {t(`packages.my.tabsShort.${k}`)}
                </span>
                <span className="hidden sm:inline">
                  {t(`packages.my.tabs.${k}`)}
                </span>
                <span className="tabular-nums opacity-70">
                  {groups[k].length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((k) => (
            <TabsContent key={k} value={k}>
              {groups[k].length === 0 ? (
                <p className="rounded-xl bg-card p-6 text-muted-foreground ring-1 ring-border">
                  {t(`packages.my.empty.${k}`)}
                </p>
              ) : (
                <PackageList items={groups[k]} onLog={setLogOf} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
      {logOf && <LogDialog pkg={logOf} onClose={() => setLogOf(null)} />}
    </div>
  )
}

function PackageList({
  items,
  onLog,
}: {
  items: CustomerPackage[]
  onLog: (p: CustomerPackage) => void
}) {
  const { t } = useTranslation()
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {items.map((p) => (
        <li
          key={p.id}
          // a column with the buttons pinned to the bottom: cards side by side are as tall as each other (grid), so their
          // buttons line up whatever text is above them
          className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-border"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-lg font-semibold">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                {p.branch_name} · {coversLabel(t, p)}
              </p>
              <p className="text-sm text-muted-foreground">
                {optionLabel(t, p)} · {money(p.price, p.currency)} · {p.code}
              </p>
            </div>
            <Badge
              className={cn(
                "border-0",
                p.status === "active"
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200"
                  : p.status === "pending_payment"
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {statusLabel(t, p)}
            </Badge>
          </div>
          {p.payment_status === "paid" && p.status !== "cancelled" && (
            <p className="text-sm font-medium">
              {leftLabel(t, p, ymdLabel)}
              {p.kind === "times" &&
                p.expires_on &&
                ` · ${t("packages.useBy", { day: ymdLabel(p.expires_on) })}`}
            </p>
          )}
          {p.status === "pending_payment" && p.slip_sent_at && (
            <p className="text-sm text-muted-foreground">
              {t("packages.my.slipChecking")}
            </p>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            {p.status === "pending_payment" && (
              <Button asChild className="h-11">
                <Link
                  to={`/b/${p.branch_slug}/package/${p.id}`}
                  state={{ from: "my-packages" }}
                >
                  {p.slip_sent_at
                    ? t("packages.my.view")
                    : t("packages.my.pay")}
                </Link>
              </Button>
            )}
            {p.status === "active" && (
              <Button asChild className="h-11">
                {/* opens the branch on what the package pays (its space, or its group classes), with the package
                    already chosen to pay */}
                <Link
                  to={`/b/${p.branch_slug}?${selectionQuery({
                    sport: p.sport_id,
                    what: p.covers === "space" ? "court" : "class",
                    court: p.resource_id ?? undefined,
                    pkg: p.id,
                  })}#book`}
                >
                  {t("packages.my.bookNow")}
                </Link>
              </Button>
            )}
            {/* paid and the slip sent, waiting for the team: ask them on WhatsApp to approve it */}
            {p.status === "pending_payment" &&
              p.slip_sent_at &&
              p.branch_slug && <AskToApprove pkg={p} slug={p.branch_slug} />}
            {/* not paid yet: they can drop it any time. Once they sent the slip (paid, the team checks it) or it is paid,
                it is the team's to cancel */}
            {p.status === "pending_payment" &&
              p.payment_status !== "paid" &&
              !p.slip_sent_at && <CancelUnpaid pkg={p} />}
            {(p.status === "used_up" || p.status === "expired") &&
              p.branch_slug && <BuyAgain pkg={p} slug={p.branch_slug} />}
            {p.payment_status === "paid" && (
              <Button
                variant="outline"
                className="h-11"
                onClick={() => onLog(p)}
              >
                <HistoryIcon />
                {t("packages.log")}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function LogDialog({
  pkg,
  onClose,
}: {
  pkg: CustomerPackage
  onClose: () => void
}) {
  const { t } = useTranslation()
  const log = useMyPackageVisits(pkg.id)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("packages.logTitle", { code: pkg.code })}
          </DialogTitle>
        </DialogHeader>
        {log.isPending ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : log.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("packages.logEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {log.data?.map((v) => (
              <li key={v.id} className="rounded-lg border p-3 text-sm">
                <p className="flex items-center justify-between gap-2 font-medium">
                  <span>
                    {v.change < 0
                      ? t("packages.logUsed")
                      : v.change > 0
                        ? t("packages.logAdded", { count: v.change })
                        : t("packages.logNoChange")}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {dayIn(v.created_at, "Asia/Vientiane")}
                  </span>
                </p>
                {v.note && <p className="text-muted-foreground">{v.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * A package that is used up or out of time: buy the same one again. It asks first, the same popup as on the branch
 * page ("Buy this package? You pay on the next step"), with today's name, option and price; Continue makes a new
 * package that waits for payment and opens its payment page. One no longer on sale says so.
 */
function BuyAgain({ pkg: p, slug }: { pkg: CustomerPackage; slug: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState(false)
  // what is on sale now (the price may have changed since it was bought)
  const onSale = usePublicPackages(slug, asking)
  // the branch's time zone, for the "until …" date
  const branch = usePublicBranch(slug, asking)
  const pkg = onSale.data?.find((x) => x.id === p.package_id)
  const option = pkg?.options.find((o) => o.id === p.option_id)
  const buy = useBuyPackage(slug, {
    onSuccess: (bought) => {
      void queryClient.invalidateQueries({ queryKey: packageKeys.mine })
      setAsking(false)
      navigate(`/b/${slug}/package/${bought.id}`, {
        state: { from: "my-packages" },
      })
    },
  })
  return (
    <>
      <Button
        className="h-11"
        onClick={() => {
          buy.reset()
          setAsking(true)
        }}
      >
        <RotateCwIcon />
        {t("packages.buyAgain")}
      </Button>
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("packages.public.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("packages.public.confirmLead")}
            </DialogDescription>
          </DialogHeader>
          {onSale.isPending ? (
            <Skeleton className="h-24 rounded-lg" />
          ) : pkg && option ? (
            <PackageBuySummary
              pkg={pkg}
              option={option}
              tz={branch.data?.timezone ?? "Asia/Vientiane"}
            />
          ) : (
            // taken off sale (or the option removed) since it was bought
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t("errors:PACKAGE_NOT_ON_SALE")}
            </p>
          )}
          <ErrorAlert error={buy.error} />
          <DialogFooter>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setAsking(false)}
            >
              {t("dash.cancel")}
            </Button>
            <Button
              className="h-11"
              disabled={buy.isPending || !pkg || !option}
              onClick={() =>
                buy.mutate({ packageId: p.package_id, optionId: p.option_id })
              }
            >
              {buy.isPending && <Spinner />}
              {t("packages.public.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Drop a package that is not paid yet (asks first): it is cancelled, nothing was paid, it can be bought again */
function CancelUnpaid({ pkg: p }: { pkg: CustomerPackage }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState(false)
  const cancel = useCancelMyPackage({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: packageKeys.mine })
      setAsking(false)
    },
  })
  return (
    <>
      <Button
        variant="ghost"
        className="h-11 text-destructive"
        onClick={() => {
          cancel.reset()
          setAsking(true)
        }}
      >
        {t("packages.cancel")}
      </Button>
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("packages.cancelTitle", { code: p.code })}
            </DialogTitle>
            <DialogDescription>{t("packages.my.cancelLead")}</DialogDescription>
          </DialogHeader>
          <ErrorAlert error={cancel.error} />
          <DialogFooter>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setAsking(false)}
            >
              {t("packages.cancelKeep")}
            </Button>
            <Button
              variant="destructive"
              className="h-11"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(p.id)}
            >
              {cancel.isPending && <Spinner />}
              {t("packages.cancelConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
