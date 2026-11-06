import { useMutation, useQueryClient } from "@tanstack/react-query"
import { TicketIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import type { PackageItem, PackageOption } from "@/lib/api/types"
import { money } from "@/lib/format"
import { coversLabel, optionLabel } from "@/lib/packages"
import { useSession } from "@/stores/session"

import { myPackageApi, packageKeys, usePublicPackages } from "./api"
import { usePublic } from "./context"

/**
 * The passes the branch sells (10 or 20 times, 1 or 3 months). A customer picks one, it waits for payment, and the
 * next page takes them through paying. Nothing shows when the branch sells none. Needs an account: a pass belongs
 * to one person.
 */
export function PackagesSection() {
  const { t } = useTranslation()
  const { slug, business } = usePublic()
  const packages = usePublicPackages(slug, business.type === "sport")
  const user = useSession((s) => s.user)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [choice, setChoice] = useState<{
    pkg: PackageItem
    option: PackageOption
  } | null>(null)
  const buy = useMutation({
    mutationFn: (c: { pkg: PackageItem; option: PackageOption }) =>
      myPackageApi.buy(slug, c.pkg.id, c.option.id),
    onSuccess: (bought) => {
      void queryClient.invalidateQueries({ queryKey: packageKeys.mine })
      setChoice(null)
      navigate(`/b/${slug}/package/${bought.id}`)
    },
  })

  if (!packages.data?.length) return null
  const here = encodeURIComponent(`${pathname}#packages`)

  return (
    <section id="packages" className="scroll-mt-20">
      <div className="mb-5">
        <h2 className="display-tight text-3xl">
          <span className="candy-label [--candy:var(--candy-purple)]">
            {t("packages.public.title")}
          </span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("packages.public.lead")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {packages.data.map((p) => (
          <article key={p.id} className="space-y-3 rounded-xl bg-card p-4">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <TicketIcon className="size-5 shrink-0" />
                {p.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {coversLabel(t, p)}
              </p>
              {p.description && (
                <p className="mt-1 text-sm whitespace-pre-line">
                  {p.description}
                </p>
              )}
            </div>
            <ul className="space-y-2">
              {p.options.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{optionLabel(t, o)}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.kind === "months"
                        ? t("packages.public.unlimited")
                        : o.valid_days > 0
                          ? t("packages.validDays", { count: o.valid_days })
                          : t("packages.public.noExpiry")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="display-tight text-lg tabular-nums">
                      {money(o.price, p.currency)}
                    </span>
                    {user ? (
                      <Button
                        className="h-11"
                        onClick={() => setChoice({ pkg: p, option: o })}
                      >
                        {t("packages.public.buy")}
                      </Button>
                    ) : (
                      <Button asChild variant="outline" className="h-11">
                        <Link to={`/login?next=${here}`}>
                          {t("packages.public.loginToBuy")}
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <Dialog open={!!choice} onOpenChange={(o) => !o && setChoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("packages.public.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("packages.public.confirmLead")}
            </DialogDescription>
          </DialogHeader>
          {choice && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="font-semibold">{choice.pkg.name}</p>
              <p className="text-sm text-muted-foreground">
                {optionLabel(t, choice.option)}
              </p>
              <p className="display-tight text-2xl tabular-nums">
                {money(choice.option.price, choice.pkg.currency)}
              </p>
            </div>
          )}
          <ErrorAlert error={buy.error} />
          <DialogFooter>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setChoice(null)}
            >
              {t("dash.cancel")}
            </Button>
            <Button
              className="h-11"
              disabled={buy.isPending}
              onClick={() => choice && buy.mutate(choice)}
            >
              {buy.isPending && <Spinner />}
              {t("packages.public.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
