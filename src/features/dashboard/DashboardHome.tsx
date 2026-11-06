import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2Icon, CircleIcon, ListChecksIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { PackageFinder } from "./packages/PackageFinder"
import { useDashboard } from "./context"
import { GoLiveGuide, type GuideStep } from "./GoLiveGuide"
import { TonightPlan } from "./TonightPlan"
import { UpcomingBookings } from "./UpcomingBookings"
import { EventPayments } from "./EventPayments"
import { PaymentsAttention } from "./PaymentsAttention"
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
      {branch.type === "sport" && <PackageFinder />}
      {canSetUp ? (
        <PagePanel />
      ) : (
        <>
          <Panel title={t("dashboard.staffTitle")}>
            <p className="mb-4 text-muted-foreground">
              {t("dashboard.staffLead")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(branch.type === "restaurant"
                ? (["calendar", "bookings"] as const)
                : (["calendar", "bookings", "cash-up"] as const)
              ).map((to) => (
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
          <UpcomingBookings />
        </>
      )}
    </div>
  )
}

/** A restaurant's Overview: tonight's floor plan or the bookings to come, one at a time */
function OverviewTabs() {
  const { t } = useTranslation()
  return (
    <Tabs defaultValue="plan" className="space-y-4">
      <TabsList className="h-11 lg:h-9">
        <TabsTrigger value="plan" className="px-4">
          {t("tonight.tab")}
        </TabsTrigger>
        <TabsTrigger value="upcoming" className="px-4">
          {t("upcoming.title")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="plan">
        <TonightPlan />
      </TabsContent>
      <TabsContent value="upcoming">
        <UpcomingBookings />
      </TabsContent>
    </Tabs>
  )
}

/** Published: the bookings to come (the link and QR code are on the Share page). Not yet: the steps to go live */
function PagePanel() {
  const { t } = useTranslation()
  const { branch } = useDashboard()
  const settings = useSettings()
  // publishing is for the owner and admins
  const isOwner = roleAtLeast(branch.role, "admin")
  if (settings.isPending) return <Skeleton className="h-64 rounded-xl" />
  if (!settings.data) return <ErrorAlert error={settings.error} />
  const s = settings.data

  if (s.status === "published") {
    // live: what is coming up (the booking page link and QR code are on the Share page)
    return (
      <div className="space-y-6">
        {branch.type === "restaurant" && <EventPayments />}
        {roleAtLeast(branch.role, "manager") && <PaymentsAttention />}
        {branch.type === "restaurant" ? <OverviewTabs /> : <UpcomingBookings />}
      </div>
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

type Step = {
  id: Exclude<GuideStep["id"], "publish">
  done: boolean
  label: string
  to: string
  ownerOnly?: boolean
}

function Checklist({ isOwner }: { isOwner: boolean }) {
  const { branch } = useDashboard()
  const settings = useSettings().data
  const profile: Step = {
    id: "profile",
    done: !!settings?.address || !!settings?.description,
    label: "overview.steps.profile",
    to: "settings",
    ownerOnly: true,
  }
  return branch.type === "restaurant" ? (
    <RestaurantChecklist isOwner={isOwner} profile={profile} />
  ) : (
    <SportChecklist isOwner={isOwner} profile={profile} />
  )
}

/** A restaurant can go live with its opening hours and one table (with seats) in an active area */
function RestaurantChecklist({
  isOwner,
  profile,
}: {
  isOwner: boolean
  profile: Step
}) {
  const biz = useBiz()
  const areas = useSportsList()
  const tables = useResourcesList()
  const [hours] = useQueries({ queries: [hoursQuery(biz, "venue", 0)] })
  const activeAreas = new Set(
    (areas.data ?? []).filter((a) => a.active).map((a) => a.id),
  )
  const steps: Step[] = [
    profile,
    {
      id: "area",
      done: activeAreas.size > 0,
      label: "overview.steps.area",
      to: "setup/floor-plan",
    },
    {
      id: "table",
      done: (tables.data ?? []).some(
        (x) => x.active && (x.seats ?? 0) > 0 && activeAreas.has(x.sport_id),
      ),
      label: "overview.steps.table",
      to: "setup/floor-plan",
    },
    {
      id: "venueHours",
      done: ((hours.data as unknown[] | undefined)?.length ?? 0) > 0,
      label: "overview.steps.venueHours",
      to: "setup/hours",
    },
  ]
  return <StepList isOwner={isOwner} steps={steps} />
}

function SportChecklist({
  isOwner,
  profile,
}: {
  isOwner: boolean
  profile: Step
}) {
  const biz = useBiz()
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
  const steps: Step[] = [
    profile,
    {
      id: "sport",
      done: (sports.data?.length ?? 0) > 0,
      label: "overview.steps.sport",
      to: "setup/sports",
    },
    {
      id: "court",
      done: active.length > 0,
      label: "overview.steps.court",
      to: "setup/spaces",
    },
    {
      id: "hoursPrice",
      done: bookable,
      label: "overview.steps.hoursPrice",
      to: "setup/spaces",
    },
  ]
  return <StepList isOwner={isOwner} steps={steps} />
}

/** The steps to go live, the step-by-step guide, and Publish */
function StepList({ isOwner, steps }: { isOwner: boolean; steps: Step[] }) {
  const { t } = useTranslation()
  const ready = steps.slice(1).every((s) => s.done)
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <Panel
      title={t("overview.checklistTitle")}
      lead={t("overview.checklistLead")}
      actions={
        <Button
          variant="outline"
          className="h-11 lg:h-9"
          onClick={() => setGuideOpen(true)}
        >
          <ListChecksIcon />
          {t("overview.guide.open")}
        </Button>
      }
    >
      <GoLiveGuide
        open={guideOpen}
        onOpenChange={setGuideOpen}
        isOwner={isOwner}
        steps={[
          ...steps.map((s) => ({
            id: s.id,
            done: s.done,
            to: s.to,
            ownerOnly: s.ownerOnly,
          })),
          { id: "publish" as const, done: false },
        ]}
      />
      <ol className="space-y-1">
        {steps.map((step, i) => {
          const linkable = !step.ownerOnly || isOwner
          return (
            <li key={step.id}>
              <Link
                to={linkable ? step.to : "."}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-lg px-2 hover:bg-muted",
                  !linkable && "pointer-events-none",
                )}
              >
                {step.done ? (
                  <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <CircleIcon className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "flex-1",
                    step.done && "text-muted-foreground line-through",
                  )}
                >
                  {i + 1}. {t(step.label)}
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

export function PublishButton({
  published,
  disabled,
}: {
  published?: boolean
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { base, key } = useBiz()
  const { branch } = useDashboard()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const change = useMutation({
    mutationFn: () =>
      published ? manage.unpublish(base) : manage.publish(base),
    onSuccess: () => {
      setConfirming(false)
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
      {!confirming && <ErrorAlert error={change.error} />}
      <Button
        variant={published ? "outline" : "default"}
        size="lg"
        className="h-11 lg:h-10"
        disabled={disabled || change.isPending}
        // taking a page offline is one tap for a mistake: ask first (publishing is harmless)
        onClick={() => (published ? setConfirming(true) : change.mutate())}
      >
        {change.isPending && !published && <Spinner />}
        {published ? t("overview.unpublish") : t("overview.publish")}
      </Button>
      {!published && disabled && (
        <p className="text-sm text-muted-foreground">
          {t("overview.publishNeeds")}
        </p>
      )}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("overview.unpublishTitle", { name: branch.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("overview.unpublishLead")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ErrorAlert error={change.error} />
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 lg:h-9">
              {t("overview.unpublishKeep")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="h-11 lg:h-9"
              disabled={change.isPending}
              onClick={() => change.mutate()}
            >
              {change.isPending && <Spinner />}
              {t("overview.unpublish")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
