import { HistoryIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { PageError, PageTitle } from "@/components/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useMyPackageVisits, useMyPackages } from "@/features/public/api"
import type { CustomerPackage } from "@/types/package"
import { dayIn, money } from "@/lib/format"
import { coversLabel, leftLabel, optionLabel, ymdLabel } from "@/lib/packages"
import { cn } from "@/lib/utils"

/** /account/packages — every package the customer bought, at every branch: how much is left, pay, book */
export function MyPackagesPage() {
  const { t } = useTranslation()
  const mine = useMyPackages()
  const [logOf, setLogOf] = useState<CustomerPackage | null>(null)
  const list = mine.data ?? []
  const open = list.filter(
    (p) => p.status === "active" || p.status === "pending_payment",
  )
  const done = list.filter((p) => !open.includes(p))

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
        <>
          <PackageList items={open} onLog={setLogOf} />
          {done.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t("packages.my.past")}
              </h2>
              <PackageList items={done} onLog={setLogOf} />
            </section>
          )}
        </>
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
          className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-border"
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
              {t(`packages.status.${p.status}`)}
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
          <div className="flex flex-wrap gap-2">
            {p.status === "pending_payment" && (
              <Button asChild className="h-11">
                <Link to={`/b/${p.branch_slug}/package/${p.id}`}>
                  {p.slip_sent_at
                    ? t("packages.my.view")
                    : t("packages.my.pay")}
                </Link>
              </Button>
            )}
            {p.status === "active" && (
              <Button asChild className="h-11">
                <Link to={`/b/${p.branch_slug}#book`}>
                  {t("packages.my.bookNow")}
                </Link>
              </Button>
            )}
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
