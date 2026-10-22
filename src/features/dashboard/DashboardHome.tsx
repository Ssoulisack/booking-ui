import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2Icon, CircleIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { roleAtLeast } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { useSession } from "@/stores/session"

import {
  hoursQuery,
  manage,
  priceQuery,
  useBiz,
  useResourcesList,
  useSettings,
  useSportsList,
} from "./api"
import { useDashboard } from "./context"
import { ShareBooking } from "./ShareBooking"
import { PageHeader, Panel } from "./ui"

/** /dashboard/:id — what to do next: get the booking page live, then share it */
export function DashboardHome() {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const { branch } = useDashboard()
  const canSetUp = roleAtLeast(branch.role, "manager")

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.welcome", { name: user?.name })}
        lead={t("dashboard.youAre", {
          role: t(`roles.${branch.role}`),
          branch: branch.name,
        })}
      />
      {canSetUp ? (
        <PagePanel />
      ) : (
        <Panel title={t("dashboard.staffTitle")}>
          <p className="mb-4 text-muted-foreground">
            {t("dashboard.staffLead")}
          </p>
          <div className="flex flex-wrap gap-2">
            {(["calendar", "bookings", "cash-up"] as const).map((to) => (
              <Button
                key={to}
                asChild
                variant={to === "calendar" ? "default" : "outline"}
                className="h-11 lg:h-9"
              >
                <Link to={to}>
                  {t(`nav.${to === "cash-up" ? "cashUp" : to}`)}
                </Link>
              </Button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}

/** Published: the link to share. Not yet: the steps to get there, then Publish */
function PagePanel() {
  const { t } = useTranslation()
  const { branch } = useDashboard()
  const settings = useSettings()
  // publishing is for the owner and admins
  const isOwner = roleAtLeast(branch.role, "admin")
  if (settings.isPending) return <Skeleton className="h-64 rounded-xl" />
  if (!settings.data) return <ErrorAlert error={settings.error} />
  const s = settings.data
  const url = `${window.location.origin}${s.public_path}`

  if (s.status === "published") {
    return (
      <Panel
        title={t("overview.liveTitle")}
        lead={t("overview.liveLead")}
        actions={
          <Badge className="border-0 bg-emerald-100 text-emerald-900">
            {t("status.published")}
          </Badge>
        }
      >
        <ShareBooking url={url} name={s.name} />
        {isOwner && <PublishButton published />}
      </Panel>
    )
  }
  if (s.status === "closed") {
    return (
      <Panel title={t("overview.closedTitle")}>
        <p className="text-muted-foreground">{t("overview.closedLead")}</p>
      </Panel>
    )
  }
  return <Checklist isOwner={isOwner} />
}

function Checklist({ isOwner }: { isOwner: boolean }) {
  const { t } = useTranslation()
  const biz = useBiz()
  const settings = useSettings().data
  const sports = useSportsList()
  const courts = useResourcesList()
  const active = (courts.data ?? []).filter((c) => c.active)
  // a court can be booked once it has opening hours and a price
  const checks = useQueries({
    queries: active.flatMap((c) => [
      hoursQuery(biz, "resource", c.id),
      priceQuery(biz, "resource", c.id),
    ]),
  })
  const bookable = active.some((_, i) => {
    const hours = checks[i * 2]?.data as unknown[] | undefined
    const price = checks[i * 2 + 1]?.data
    return (hours?.length ?? 0) > 0 && !!price
  })

  const steps = [
    {
      done: !!settings?.address || !!settings?.description,
      label: t("overview.steps.profile"),
      to: "settings",
      ownerOnly: true,
    },
    {
      done: (sports.data?.length ?? 0) > 0,
      label: t("overview.steps.sport"),
      to: "setup/sports",
    },
    {
      done: active.length > 0,
      label: t("overview.steps.court"),
      to: "setup/spaces",
    },
    {
      done: bookable,
      label: t("overview.steps.hoursPrice"),
      to: "setup/spaces",
    },
  ]
  const ready = steps.slice(1).every((s) => s.done)

  return (
    <Panel
      title={t("overview.checklistTitle")}
      lead={t("overview.checklistLead")}
    >
      <ol className="space-y-1">
        {steps.map((step, i) => {
          const linkable = !step.ownerOnly || isOwner
          return (
            <li key={step.label}>
              <Link
                to={linkable ? step.to : "."}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-lg px-2 hover:bg-muted",
                  !linkable && "pointer-events-none",
                )}
              >
                {step.done ? (
                  <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600" />
                ) : (
                  <CircleIcon className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "flex-1",
                    step.done && "text-muted-foreground line-through",
                  )}
                >
                  {i + 1}. {step.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <div className="mt-4 border-t pt-4">
        {isOwner ? (
          <PublishButton disabled={!ready} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("overview.ownerPublishes")}
          </p>
        )}
      </div>
    </Panel>
  )
}

function PublishButton({
  published,
  disabled,
}: {
  published?: boolean
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { base, key } = useBiz()
  const queryClient = useQueryClient()
  const change = useMutation({
    mutationFn: () =>
      published ? manage.unpublish(base) : manage.publish(base),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key("settings") })
      void queryClient.invalidateQueries({ queryKey: ["me", "branches"] })
      void queryClient.invalidateQueries({ queryKey: ["public"] })
      toast.success(
        published ? t("overview.unpublished") : t("overview.published"),
      )
    },
  })
  return (
    <div className="mt-4 space-y-3">
      <ErrorAlert error={change.error} />
      <Button
        variant={published ? "outline" : "default"}
        size="lg"
        className="h-11 lg:h-10"
        disabled={disabled || change.isPending}
        onClick={() => change.mutate()}
      >
        {change.isPending && <Spinner />}
        {published ? t("overview.unpublish") : t("overview.publish")}
      </Button>
      {!published && disabled && (
        <p className="text-sm text-muted-foreground">
          {t("overview.publishNeeds")}
        </p>
      )}
    </div>
  )
}
