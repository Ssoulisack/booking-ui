import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Skeleton } from "@/components/ui/skeleton"

import { useRules } from "@/hooks/use-schedule"
import { useResourcesList } from "@/hooks/use-space"
import { useSportsList } from "@/hooks/use-sport"
import { useDashboard } from "@/components/provider/dashboard-context"
import { PageHeader, Panel } from "@/components/protected/branch/ui"
import { RuleEditor } from "./RuleEditor"

/**
 * /setup/rules — this branch's changes to the company rule, then one per sport. The most specific
 * rule wins: court ← sport ← branch ← company. Court rules are set on each court's page.
 */
export function RulesPage() {
  const { t } = useTranslation()
  // a restaurant has one rule for the whole place (no per-sport or per-court rules)
  const restaurant = useDashboard().branch.type === "restaurant"
  const sports = useSportsList()
  const courts = useResourcesList()
  const rules = useRules()
  const courtOverrides = (rules.data ?? [])
    .filter((r) => r.scope_type === "resource")
    .map((r) => courts.data?.find((c) => c.id === r.scope_id))
    .filter((c) => !!c)

  return (
    <div className="space-y-6">
      <PageHeader title={t("rules.title")} lead={t("rules.lead")} />
      <RuleEditor
        scope="branch"
        scopeId={0}
        self={{}}
        title={t("rules.branchTitle")}
        lead={t("rules.branchLead")}
      />
      {restaurant ? null : sports.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        sports.data?.map((s) => (
          <RuleEditor
            key={s.id}
            scope="sport"
            scopeId={s.id}
            parent={{}}
            self={{ sport_id: s.id }}
            title={t("rules.sportTitle", { sport: s.name })}
            lead={t("rules.sportLead")}
          />
        ))
      )}
      {!restaurant && (
        <Panel title={t("rules.courtsTitle")} lead={t("rules.courtsLead")}>
          {courtOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("rules.noCourtRules")}
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {courtOverrides.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`../spaces/${c.id}`}
                    className="inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium hover:bg-muted lg:h-9"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  )
}
