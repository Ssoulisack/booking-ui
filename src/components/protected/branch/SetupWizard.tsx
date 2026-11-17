import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LightbulbIcon,
  PlusIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { ErrorAlert } from "@/components/global/form"
import { PageError, PageLoader } from "@/components/global/page-state"
import { useDashboard } from "@/components/provider/dashboard-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/global/MoneyInput"
import { TimeInput } from "@/components/global/time-input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { SPORT_TYPES, type SportType } from "@/lib/places"
import { todayIn } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useWizardData, useWizardStep } from "@/hooks/use-setup-wizard"
import type { ManagedSport } from "@/types/sport"
import type { ResourceKind } from "@/types/space"

import { WEEK } from "@/components/protected/setup/shared"

/** the sports most places in Laos start with, shown first */
const POPULAR: SportType[] = ["badminton", "tennis", "football", "boxing"]
const MORE = SPORT_TYPES.filter((s) => !POPULAR.includes(s))

/** sports played in the evening under lights: the light is offered from the start */
const LIT: SportType[] = [
  "badminton",
  "tennis",
  "football",
  "futsal",
  "basketball",
  "volleyball",
  "petanque",
]
/** sports with a weekly group class from the start */
const CLASS_SPORTS: SportType[] = ["boxing", "muay_thai"]

interface SpacePlan {
  kind: ResourceKind
  names: string[]
  price: string
  open: string
  close: string
  light: boolean
  lightPrice: string
  lightFrom: string
}

interface ClassPlan {
  on: boolean
  title: string
  start: string
  end: string
  weekdays: number[]
  capacity: string
  price: string
}

/** The ready-made spaces of a sport (names in the team's language; all can be changed) */
function presetSpaces(type: SportType, t: TFunction): SpacePlan {
  const n = (key: string, count: number, from = 1) =>
    Array.from({ length: count }, (_, i) =>
      t(`wizard.names.${key}`, { n: from + i }),
    )
  const base = {
    price: "",
    open: "06:00",
    close: "22:00",
    light: LIT.includes(type),
    lightPrice: "",
    lightFrom: "17:00",
  }
  switch (type) {
    case "badminton":
      return { ...base, kind: "court", names: n("court", 3) }
    case "tennis":
      return {
        ...base,
        kind: "court",
        names: [...n("hardCourt", 2), ...n("clayCourt", 1)],
      }
    case "football":
    case "futsal":
      return { ...base, kind: "pitch", names: n("pitch", 2) }
    case "boxing":
    case "muay_thai":
      return {
        ...base,
        kind: "ring",
        names: [t("wizard.names.privateSession")],
      }
    case "table_tennis":
      return { ...base, kind: "table", names: n("table", 4) }
    case "swimming":
      return { ...base, kind: "lane", names: n("lane", 4) }
    case "golf":
      return { ...base, kind: "bay", names: n("bay", 6) }
    case "fitness":
      return { ...base, kind: "room", names: n("room", 1) }
    case "basketball":
    case "volleyball":
    case "petanque":
      return {
        ...base,
        kind: "court",
        names: n("court", type === "petanque" ? 2 : 1),
      }
    default:
      return { ...base, kind: "other", names: n("space", 1) }
  }
}

const presetClass = (t: TFunction): ClassPlan => ({
  on: true,
  title: t("wizard.names.groupClass"),
  start: "18:00",
  end: "20:00",
  weekdays: [1, 2, 3, 4, 5, 6],
  capacity: "12",
  price: "",
})

const toNumber = (v: string) => Number(v.replace(/[^\d]/g, "") || 0)

/**
 * /dashboard/:id/start — a new sport branch is set up step by step: 1 name (done when it was made),
 * 2 sports, 3 spaces with price, hours and sport light, 4 group classes. Each step is saved when the
 * team goes on, so leaving half-way and coming back opens the step it was at.
 */
export function SetupWizard() {
  const { t } = useTranslation()
  const { branch } = useDashboard()
  const step = branch.setup_step || 2
  const { settings, sports, resources, timetables } = useWizardData()

  if (
    settings.isPending ||
    sports.isPending ||
    resources.isPending ||
    timetables.isPending
  ) {
    return <PageLoader />
  }
  if (!settings.data || !sports.data || !resources.data || !timetables.data) {
    const failed =
      settings.error ?? sports.error ?? resources.error ?? timetables.error
    const retry = () => {
      for (const q of [settings, sports, resources, timetables])
        void q.refetch()
    }
    return <PageError error={failed} onRetry={retry} />
  }

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-heading">
        {t("wizard.title", { name: branch.name })}
      </h1>
      <p className="mt-1 text-muted-foreground">{t("wizard.lead")}</p>
      <Stepper at={step} />
      {step === 2 && <SportsStep key="sports" sports={sports.data} />}
      {step === 3 && (
        <SpacesStep
          key="spaces"
          sports={sports.data}
          taken={resources.data.map((r) => ({
            sport: r.sport_id,
            name: r.name,
          }))}
          currency={settings.data.in_force.currency}
        />
      )}
      {step === 4 && (
        <ClassesStep
          key="classes"
          sports={sports.data}
          classSports={timetables.data.map((tt) => tt.sport_id)}
          currency={settings.data.in_force.currency}
          today={todayIn(settings.data.in_force.timezone)}
        />
      )}
    </div>
  )
}

function Stepper({ at }: { at: number }) {
  const { t } = useTranslation()
  const steps = ["branch", "sports", "spaces", "classes"] as const
  return (
    <ol className="my-6 grid grid-cols-4 gap-2">
      {steps.map((s, i) => {
        const n = i + 1
        const done = n < at
        const now = n === at
        return (
          <li key={s} className="flex flex-col items-center gap-1 text-center">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-semibold ring-1",
                done && "bg-primary text-primary-foreground ring-primary",
                now && "text-primary ring-2 ring-primary",
                !done && !now && "text-muted-foreground ring-border",
              )}
            >
              {done ? <CheckIcon className="size-4" /> : n}
            </span>
            <span
              className={cn(
                "text-xs sm:text-sm",
                now ? "font-medium" : "text-muted-foreground",
              )}
            >
              {t(`wizard.steps.${s}`)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Footer({
  onBack,
  onNext,
  nextLabel,
  pending,
  disabled,
}: {
  onBack?: () => void
  onNext: () => void
  nextLabel: string
  pending: boolean
  disabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button
            variant="outline"
            className="h-11 lg:h-9"
            onClick={onBack}
            disabled={pending}
          >
            <ChevronLeftIcon />
            {t("actions.back")}
          </Button>
        ) : (
          <span />
        )}
        <Button
          className="h-11 lg:h-9"
          onClick={onNext}
          disabled={pending || disabled}
        >
          {pending && <Spinner />}
          {nextLabel}
          {!pending && <ChevronRightIcon />}
        </Button>
      </div>
    </div>
  )
}

// ---------- step 2: sports ----------

function SportsStep({ sports }: { sports: ManagedSport[] }) {
  const { t } = useTranslation()
  const { saveSports, pending, error } = useWizardStep()
  const [chosen, setChosen] = useState<SportType[]>(() =>
    sports.length ? sports.map((s) => s.type) : [],
  )
  const [more, setMore] = useState(() => chosen.some((c) => MORE.includes(c)))
  const toggle = (type: SportType) =>
    setChosen((c) =>
      c.includes(type) ? c.filter((x) => x !== type) : [...c, type],
    )

  const save = () =>
    saveSports(sports, chosen, (type) => t(`sportTypes.${type}`))

  const chip = (type: SportType) => {
    const on = chosen.includes(type)
    return (
      <button
        key={type}
        type="button"
        aria-pressed={on}
        onClick={() => toggle(type)}
        className={cn(
          "flex h-12 items-center justify-between gap-2 rounded-xl px-4 text-left ring-1 transition-colors",
          on
            ? "bg-primary/10 font-medium ring-2 ring-primary"
            : "ring-border hover:bg-muted",
        )}
      >
        {t(`sportTypes.${type}`)}
        {on && <CheckIcon className="size-4 text-primary" />}
      </button>
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("wizard.sports.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("wizard.sports.lead")}
        </p>
      </div>
      <p className="text-sm font-medium">{t("wizard.sports.popular")}</p>
      <div className="grid grid-cols-2 gap-2">{POPULAR.map(chip)}</div>
      {more ? (
        <>
          <p className="pt-2 text-sm font-medium">{t("wizard.sports.more")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MORE.map(chip)}
          </div>
        </>
      ) : (
        <Button variant="ghost" onClick={() => setMore(true)}>
          <PlusIcon />
          {t("wizard.sports.showMore")}
        </Button>
      )}
      <ErrorAlert error={error} />
      <Footer
        onNext={() => void save()}
        nextLabel={t("actions.next")}
        pending={pending}
        disabled={chosen.length === 0}
      />
    </section>
  )
}

// ---------- step 3: spaces ----------

function SpacesStep({
  sports,
  taken,
  currency,
}: {
  sports: ManagedSport[]
  taken: Array<{ sport: number; name: string }>
  currency: string
}) {
  const { t } = useTranslation()
  const { saveSpaces, goTo, pending, error } = useWizardStep()
  const [plans, setPlans] = useState<Record<number, SpacePlan>>(() =>
    Object.fromEntries(sports.map((s) => [s.id, presetSpaces(s.type, t)])),
  )
  const [tried, setTried] = useState(false)
  const set = (sportId: number, change: Partial<SpacePlan>) =>
    setPlans((p) => ({ ...p, [sportId]: { ...p[sportId], ...change } }))
  // a sport that already has spaces (made before leaving half-way) is done
  const todo = sports.filter((s) => !taken.some((r) => r.sport === s.id))

  const problem = (p: SpacePlan) =>
    p.names.some((n) => !n.trim())
      ? "names"
      : toNumber(p.price) <= 0
        ? "price"
        : p.open >= p.close
          ? "hours"
          : p.light && toNumber(p.lightPrice) <= 0
            ? "lightPrice"
            : null

  const save = () => {
    setTried(true)
    if (todo.some((s) => problem(plans[s.id]))) return
    void saveSpaces(
      todo.map((s) => {
        const p = plans[s.id]
        return {
          sportId: s.id,
          kind: p.kind,
          names: p.names.map((n) => n.trim()),
          pricePerHour: toNumber(p.price),
          open: p.open,
          close: p.close,
          lightPrice: p.light ? toNumber(p.lightPrice) : 0,
          lightFrom: p.lightFrom,
        }
      }),
      currency,
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("wizard.spaces.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("wizard.spaces.lead")}
        </p>
      </div>
      {sports.map((s) => {
        const made = taken.filter((r) => r.sport === s.id)
        if (made.length) {
          return (
            <div key={s.id} className="rounded-xl p-4 ring-1 ring-border">
              <h3 className="font-semibold">{s.name}</h3>
              <p className="text-sm text-muted-foreground">
                {t("wizard.spaces.made", {
                  names: made.map((r) => r.name).join(", "),
                })}
              </p>
            </div>
          )
        }
        const p = plans[s.id]
        const why = tried ? problem(p) : null
        return (
          <div
            key={s.id}
            className="space-y-4 rounded-xl p-4 ring-1 ring-border"
          >
            <h3 className="font-semibold">
              {s.name}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ·{" "}
                {t("wizard.spaces.count", {
                  count: p.names.length,
                  kind: t(`setup.kinds.${p.kind}`),
                })}
              </span>
            </h3>
            <div className="space-y-2">
              {p.names.map((name, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    aria-label={t("wizard.spaces.name", { n: i + 1 })}
                    value={name}
                    onChange={(e) =>
                      set(s.id, {
                        names: p.names.map((x, j) =>
                          j === i ? e.target.value : x,
                        ),
                      })
                    }
                    className="h-11 text-base lg:h-9 lg:text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 lg:size-9"
                    aria-label={t("actions.remove")}
                    disabled={p.names.length === 1}
                    onClick={() =>
                      set(s.id, { names: p.names.filter((_, j) => j !== i) })
                    }
                  >
                    <XIcon />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                onClick={() =>
                  set(s.id, {
                    names: [
                      ...p.names,
                      t(
                        `wizard.names.${p.kind === "pitch" ? "pitch" : p.kind === "ring" ? "ring" : "court"}`,
                        {
                          n: p.names.length + 1,
                        },
                      ),
                    ],
                  })
                }
              >
                <PlusIcon />
                {t("wizard.spaces.addOne")}
              </Button>
              {why === "names" && <Hint>{t("wizard.spaces.needName")}</Hint>}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">
                  {t("wizard.spaces.price", { currency })}
                </span>
                <MoneyInput
                  value={p.price}
                  placeholder="100.000"
                  onChange={(v) => set(s.id, { price: v })}
                  className="h-11 text-base lg:h-9 lg:text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{t("wizard.spaces.opens")}</span>
                <TimeInput
                  className="w-full rounded-lg text-left"
                  label={t("wizard.spaces.opens")}
                  value={p.open}
                  onChange={(v) => set(s.id, { open: v })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{t("wizard.spaces.closes")}</span>
                <TimeInput
                  className="w-full rounded-lg text-left"
                  label={t("wizard.spaces.closes")}
                  value={p.close}
                  onChange={(v) => set(s.id, { close: v })}
                  midnightEnd
                />
              </label>
            </div>
            {why === "price" && <Hint>{t("wizard.spaces.needPrice")}</Hint>}
            {why === "hours" && <Hint>{t("wizard.spaces.needHours")}</Hint>}
            <p className="text-xs text-muted-foreground">
              {t("wizard.spaces.everyDay")}
            </p>

            <div className="space-y-3 rounded-lg bg-muted/50 p-3">
              <label className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium">
                  <LightbulbIcon className="size-4" />
                  {t("wizard.spaces.light")}
                </span>
                <Switch
                  checked={p.light}
                  onCheckedChange={(on) => set(s.id, { light: on })}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                {t("wizard.spaces.lightLead")}
              </p>
              {p.light && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">
                      {t("wizard.spaces.lightPrice", { currency })}
                    </span>
                    <MoneyInput
                      value={p.lightPrice}
                      placeholder="20.000"
                      onChange={(v) => set(s.id, { lightPrice: v })}
                      className="h-11 text-base lg:h-9 lg:text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">
                      {t("wizard.spaces.lightFrom")}
                    </span>
                    <TimeInput
                      className="w-full rounded-lg text-left"
                      label={t("wizard.spaces.lightFrom")}
                      value={p.lightFrom}
                      onChange={(v) => set(s.id, { lightFrom: v })}
                    />
                  </label>
                </div>
              )}
              {why === "lightPrice" && (
                <Hint>{t("wizard.spaces.needLightPrice")}</Hint>
              )}
            </div>
          </div>
        )
      })}
      <ErrorAlert error={error} />
      <Footer
        onBack={() => void goTo(2)}
        onNext={save}
        nextLabel={t("actions.next")}
        pending={pending}
      />
    </section>
  )
}

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-destructive">{children}</p>
)

// ---------- step 4: group classes ----------

function ClassesStep({
  sports,
  classSports,
  currency,
  today,
}: {
  sports: ManagedSport[]
  /** sports that already have a weekly class (made before leaving half-way) */
  classSports: number[]
  currency: string
  today: string
}) {
  const { t } = useTranslation()
  const { finish: save, goTo, pending, error } = useWizardStep()
  const withClass = sports.filter((s) => CLASS_SPORTS.includes(s.type))
  const [plans, setPlans] = useState<Record<number, ClassPlan>>(() =>
    Object.fromEntries(withClass.map((s) => [s.id, presetClass(t)])),
  )
  const [tried, setTried] = useState(false)
  const set = (sportId: number, change: Partial<ClassPlan>) =>
    setPlans((p) => ({ ...p, [sportId]: { ...p[sportId], ...change } }))

  const has = (sportId: number) => classSports.includes(sportId)
  const todo = withClass.filter((s) => !has(s.id) && plans[s.id].on)
  const problem = (p: ClassPlan) =>
    !p.title.trim()
      ? "title"
      : p.start >= p.end
        ? "hours"
        : p.weekdays.length === 0
          ? "days"
          : toNumber(p.capacity) < 1
            ? "capacity"
            : null

  const finish = () => {
    setTried(true)
    if (todo.some((s) => problem(plans[s.id]))) return
    void save(
      todo.map((s) => {
        const p = plans[s.id]
        return {
          sport_id: s.id,
          coach_id: null,
          resource_id: null,
          title: p.title.trim(),
          start_time: p.start,
          end_time: p.end,
          weekdays: p.weekdays,
          starts_on: today,
          ends_on: "",
          capacity: toNumber(p.capacity),
          price: toNumber(p.price),
          currency,
          active: true,
        }
      }),
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("wizard.classes.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("wizard.classes.lead")}
        </p>
      </div>
      {withClass.length === 0 && (
        <p className="rounded-xl p-4 text-muted-foreground ring-1 ring-border">
          {t("wizard.classes.none")}
        </p>
      )}
      {withClass.map((s) => {
        if (has(s.id)) {
          return (
            <div key={s.id} className="rounded-xl p-4 ring-1 ring-border">
              <h3 className="font-semibold">{s.name}</h3>
              <p className="text-sm text-muted-foreground">
                {t("wizard.classes.made")}
              </p>
            </div>
          )
        }
        const p = plans[s.id]
        const why = tried && p.on ? problem(p) : null
        return (
          <div
            key={s.id}
            className="space-y-4 rounded-xl p-4 ring-1 ring-border"
          >
            <label className="flex items-center justify-between gap-3">
              <span className="font-semibold">
                {s.name} · {t("wizard.classes.groupClass")}
              </span>
              <Switch
                checked={p.on}
                onCheckedChange={(on) => set(s.id, { on })}
              />
            </label>
            {p.on && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">
                    {t("wizard.classes.name")}
                  </span>
                  <Input
                    value={p.title}
                    onChange={(e) => set(s.id, { title: e.target.value })}
                    className="h-11 text-base lg:h-9 lg:text-sm"
                  />
                </label>
                {why === "title" && <Hint>{t("wizard.classes.needName")}</Hint>}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">
                      {t("wizard.classes.start")}
                    </span>
                    <TimeInput
                      className="w-full rounded-lg text-left"
                      label={t("wizard.classes.start")}
                      value={p.start}
                      onChange={(v) => set(s.id, { start: v })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">
                      {t("wizard.classes.end")}
                    </span>
                    <TimeInput
                      className="w-full rounded-lg text-left"
                      label={t("wizard.classes.end")}
                      value={p.end}
                      onChange={(v) => set(s.id, { end: v })}
                      midnightEnd
                    />
                  </label>
                </div>
                {why === "hours" && <Hint>{t("wizard.spaces.needHours")}</Hint>}
                <div className="space-y-1 text-sm">
                  <span className="font-medium">
                    {t("wizard.classes.days")}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEK.map((d) => {
                      const on = p.weekdays.includes(d)
                      return (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            set(s.id, {
                              weekdays: on
                                ? p.weekdays.filter((x) => x !== d)
                                : [...p.weekdays, d],
                            })
                          }
                          className={cn(
                            "h-10 min-w-12 rounded-lg px-2 ring-1",
                            on
                              ? "bg-primary text-primary-foreground ring-primary"
                              : "ring-border",
                          )}
                        >
                          {t(`weekdayShort.${d}`)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {why === "days" && <Hint>{t("wizard.classes.needDays")}</Hint>}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">
                      {t("wizard.classes.capacity")}
                    </span>
                    <Input
                      inputMode="numeric"
                      value={p.capacity}
                      onChange={(e) => set(s.id, { capacity: e.target.value })}
                      className="h-11 text-base lg:h-9 lg:text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">
                      {t("wizard.classes.price", { currency })}
                    </span>
                    <MoneyInput
                      value={p.price}
                      placeholder="50.000"
                      onChange={(v) => set(s.id, { price: v })}
                      className="h-11 text-base lg:h-9 lg:text-sm"
                    />
                  </label>
                </div>
                {why === "capacity" && (
                  <Hint>{t("wizard.classes.needCapacity")}</Hint>
                )}
              </>
            )}
          </div>
        )
      })}
      <ErrorAlert error={error} />
      <Footer
        onBack={() => void goTo(3)}
        onNext={finish}
        nextLabel={t("wizard.finish")}
        pending={pending}
      />
    </section>
  )
}
