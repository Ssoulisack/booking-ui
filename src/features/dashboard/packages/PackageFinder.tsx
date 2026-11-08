import { SearchIcon, SendIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { PageError } from "@/components/global/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { CustomerPackage } from "@/types/package"
import { dayIn, money } from "@/lib/format"
import { leftLabel, optionLabel, ymdLabel } from "@/lib/packages"
import { displayPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"

import { useSettings } from "@/hooks/use-branch"
import { Panel } from "../ui"
import { useSoldPackages } from "./api"
import { PackageActions } from "./PackageActions"
import { statusTone } from "./PackageDialogs"

/** One letter alone means nothing (the server shows nothing for it): wait for a second one. A number is fine. */
export function searchable(text: string) {
  const t = text.trim()
  return t.length >= 2 || /^\d+$/.test(t)
}

/**
 * The Overview's "Find a package": a customer at the counter says their code, phone or name; the team types it and
 * the matches open in a dialog, where they can mark paid, adjust, or read the history without leaving the Overview.
 */
export function PackageFinder() {
  const { t } = useTranslation()
  const [text, setText] = useState("")
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)

  return (
    <Panel title={t("packages.find.title")} lead={t("packages.find.lead")}>
      <form
        className="flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!searchable(text)) return
          setQ(text.trim())
          setOpen(true)
        }}
      >
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={text}
            autoComplete="off"
            aria-label={t("packages.find.title")}
            placeholder={t("packages.find.placeholder")}
            onChange={(e) => setText(e.target.value)}
            className="h-11 pl-9 text-base lg:h-9 lg:text-sm"
          />
        </div>
        <Button
          type="submit"
          className="h-11 lg:h-9"
          disabled={!searchable(text)}
        >
          {t("packages.find.search")}
        </Button>
      </form>
      {text.trim().length === 1 && !/\d/.test(text) && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("packages.find.tooShort")}
        </p>
      )}
      {open && <Results q={q} onClose={() => setOpen(false)} />}
    </Panel>
  )
}

function Results({ q, onClose }: { q: string; onClose: () => void }) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const found = useSoldPackages({ q })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("packages.find.results", { q })}</DialogTitle>
          <DialogDescription>
            {t("packages.find.resultsLead")}
          </DialogDescription>
        </DialogHeader>
        {found.isPending ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : found.isError ? (
          <PageError error={found.error} onRetry={() => found.refetch()} />
        ) : found.data.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            {t("packages.find.none")}
          </p>
        ) : (
          <ul className="space-y-3">
            {found.data.map((p) => (
              <Result key={p.id} pkg={p} tz={tz} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Result({ pkg: p, tz }: { pkg: CustomerPackage; tz: string }) {
  const { t } = useTranslation()
  return (
    <li className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          {/* who is at the counter comes first */}
          <p className="text-lg leading-tight font-semibold">
            {p.customer_name}
            {p.customer_phone && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                {displayPhone(p.customer_phone)}
              </span>
            )}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono font-semibold">{p.code}</span>
            <span className="font-medium">{p.name}</span>
            <Badge className={cn("border-0", statusTone(p.status))}>
              {t(`packages.status.${p.status}`)}
            </Badge>
          </p>
          <p className="text-sm text-muted-foreground">
            {optionLabel(t, p)} · {money(p.price, p.currency)}
            {p.resource_name && ` · ${p.resource_name}`} ·{" "}
            {dayIn(p.created_at, tz)}
          </p>
        </div>
        <div className="text-right text-sm">
          {p.payment_status === "paid" && p.status !== "cancelled" ? (
            <>
              <p className="font-medium">{leftLabel(t, p, ymdLabel)}</p>
              {p.kind === "times" && p.expires_on && (
                <p className="text-muted-foreground">
                  {t("packages.useBy", { day: ymdLabel(p.expires_on) })}
                </p>
              )}
            </>
          ) : p.payment_status !== "paid" ? (
            <p className="font-medium text-amber-700 dark:text-amber-300">
              {t("packages.unpaid")}
            </p>
          ) : null}
        </div>
      </div>
      {p.slip_sent_at && p.payment_status !== "paid" && (
        <p className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm font-medium ring-1 ring-primary/30">
          <SendIcon className="size-4 shrink-0" />
          {p.slip_via === "telegram"
            ? t("packages.slipTelegram")
            : t("packages.slipWhatsapp")}
        </p>
      )}
      <PackageActions pkg={p} />
    </li>
  )
}
