import { EyeIcon, RotateCwIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { dayIn, timeIn } from "@/lib/format"
import { leftLabel, optionLabel, ymdLabel, statusLabel } from "@/lib/packages"
import { realEmail } from "@/lib/contact"
import { displayPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"
import type { Member } from "@/types/customer"
import type { CustomerPackage } from "@/types/package"
import { statusTone } from "@/components/protected/package/PackageDialogs"
import { SellDialog } from "@/components/protected/package/SellDialog"

/**
 * The Membership tab: one row per customer who bought a package here. # · name · phone · email (empty when they have
 * none) · customer code · packages active / all · an eye that opens their packages, each with the day it was bought.
 */
export function MembersTable({
  members,
  first,
  tz,
}: {
  members: Member[]
  /** the number of the first row (page 2 of 20 starts at 21) */
  first: number
  tz: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<Member | null>(null)
  const th = "py-2 pr-3 font-medium"
  return (
    <>
      {/* a phone scrolls the table sideways inside its box */}
      <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="border-b text-left whitespace-nowrap text-muted-foreground">
            <tr>
              <th className={cn(th, "w-10 text-right")}>#</th>
              <th className={th}>{t("desk.colFullName")}</th>
              <th className={th}>{t("desk.colPhone")}</th>
              <th className={th}>{t("desk.colEmail")}</th>
              <th className={th}>{t("desk.colCustomerCode")}</th>
              <th className={cn(th, "text-center")}>{t("desk.colPackages")}</th>
              <th className="py-2">
                <span className="sr-only">{t("desk.seeDetails")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m, i) => {
              return (
                <tr key={m.user_id} className="align-middle">
                  <td className="py-3 pr-3 text-right text-muted-foreground tabular-nums">
                    {first + i}
                  </td>
                  <td className="py-3 pr-3 font-medium">{m.name}</td>
                  <td className="py-3 pr-3 whitespace-nowrap tabular-nums">
                    {m.phone ? displayPhone(m.phone) : ""}
                  </td>
                  <td className="py-3 pr-3 break-all">{realEmail(m.email)}</td>
                  <td className="py-3 pr-3 font-mono text-xs whitespace-nowrap">
                    {m.member_no}
                  </td>
                  <td className="py-3 pr-3 text-center whitespace-nowrap">
                    <Badge
                      variant={m.active > 0 ? "default" : "secondary"}
                      className="tabular-nums"
                    >
                      {m.active}/{m.packages.length}
                    </Badge>
                  </td>
                  <td className="py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 lg:size-9"
                      aria-label={t("desk.seeDetailsOf", { name: m.name })}
                      onClick={() => setOpen(m)}
                    >
                      <EyeIcon />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {open && (
        <MemberDialog member={open} tz={tz} onClose={() => setOpen(null)} />
      )}
    </>
  )
}

/** One customer's packages here, newest first, with the day each was bought */
function MemberDialog({
  member: m,
  tz,
  onClose,
}: {
  member: Member
  tz: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [renew, setRenew] = useState<CustomerPackage | null>(null)
  const list = [...m.packages].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.name}</DialogTitle>
          <DialogDescription>
            {[m.member_no, m.phone && displayPhone(m.phone), realEmail(m.email)]
              .filter(Boolean)
              .join(" · ")}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm font-medium">
          {t("desk.theirPackages", {
            active: m.active,
            all: m.packages.length,
          })}
        </p>
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id} className="space-y-1 rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {p.name}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.code}
                  </span>
                </span>
                <Badge className={cn("border-0", statusTone(p.status))}>
                  {statusLabel(t, p, true)}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {optionLabel(t, p)}
                {p.status === "active" && ` · ${leftLabel(t, p, ymdLabel)}`}
              </p>
              <p className="text-muted-foreground">
                {t("desk.boughtOn", {
                  date: `${dayIn(p.created_at, tz)}, ${timeIn(p.created_at, tz)}`,
                })}
              </p>
              {p.payment_status === "paid" &&
                (p.status === "used_up" || p.status === "expired") && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 lg:h-9"
                    onClick={() =>
                      setRenew({
                        ...p,
                        customer_id: m.user_id,
                        customer_name: m.name,
                        customer_phone: m.phone,
                      })
                    }
                  >
                    <RotateCwIcon />
                    {t("packages.renew")}
                  </Button>
                )}
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" className="h-11 lg:h-9">
          <Link to={`../bookings?customer=${m.user_id}`}>
            {t("desk.seeBookings")}
          </Link>
        </Button>
      </DialogContent>
      {renew && (
        <SellDialog
          renew={renew}
          onClose={() => {
            setRenew(null)
            onClose()
          }}
        />
      )}
    </Dialog>
  )
}
