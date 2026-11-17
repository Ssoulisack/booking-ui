import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router"

import { useDashboard } from "@/components/provider/dashboard-context"
import { WEEK } from "@/components/protected/setup/shared"
import type { SportType } from "@/lib/places"
import { branchService } from "@/services/branch.api"
import { classService } from "@/services/class.api"
import { scheduleService } from "@/services/schedule.api"
import { spaceService } from "@/services/space.api"
import { sportService } from "@/services/sport.api"
import type { TimetableInput } from "@/types/class"
import type { ResourceKind } from "@/types/space"
import type { ManagedSport } from "@/types/sport"

/** What the step-by-step setup of a new sport branch reads */
export function useWizardData() {
  const id = useDashboard().branch.branch_id
  const settings = useQuery({
    queryKey: ["manage", id, "settings"],
    queryFn: () => branchService.getSettings(id),
  })
  const sports = useQuery({
    queryKey: ["manage", id, "sports"],
    queryFn: () => sportService.list(id),
  })
  const resources = useQuery({
    queryKey: ["manage", id, "resources"],
    queryFn: () => spaceService.resources(id),
  })
  const timetables = useQuery({
    queryKey: ["manage", id, "timetables"],
    queryFn: () => classService.timetables(id),
  })
  return { settings, sports, resources, timetables }
}

/** The spaces of one sport the wizard makes, all with the same price, hours and light */
export interface NewSpaces {
  sportId: number
  kind: ResourceKind
  names: string[]
  pricePerHour: number
  open: string
  close: string
  /** 0 = no sport light */
  lightPrice: number
  lightFrom: string
}

/**
 * Saves one step and moves the branch to the next (0 = done: back to the dashboard). A failed save shows its
 * error inline; whatever was saved before the failure stays and is shown as made.
 */
export function useWizardStep() {
  const id = useDashboard().branch.branch_id
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const run = async (work: () => Promise<void>, next: number) => {
    setPending(true)
    setError(null)
    try {
      await work()
      await branchService.setSetupStep(id, next)
      // the branch's lists first, then the step: the next step must open with what this one saved (a new sport
      // that arrives after it opened has no form yet)
      await queryClient.invalidateQueries({ queryKey: ["manage", id] })
      await queryClient.invalidateQueries({ queryKey: ["me", "branches"] })
      if (next === 0) navigate(`/dashboard/${id}`, { replace: true })
      else window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err)
      void queryClient.invalidateQueries({ queryKey: ["manage", id] })
    } finally {
      setPending(false)
    }
  }

  return {
    pending,
    error,
    goTo: (step: number) => run(async () => {}, step),
    /** keeps the chosen sports: makes the new ones (named in the team's language), removes the unchosen */
    saveSports: (
      existing: ManagedSport[],
      chosen: SportType[],
      nameOf: (type: SportType) => string,
    ) =>
      run(async () => {
        for (const s of existing) {
          if (!chosen.includes(s.type)) await sportService.deleteSport(id, s.id)
        }
        for (const type of chosen) {
          if (existing.some((s) => s.type === type)) continue
          await sportService.saveSport(id, {
            name: nameOf(type),
            type,
            description: "",
            image_key: "",
            active: true,
          })
        }
      }, 3),
    /** makes the spaces with their price and the same hours every day */
    saveSpaces: (plans: NewSpaces[], currency: string) =>
      run(async () => {
        for (const p of plans) {
          for (const name of p.names) {
            const r = await spaceService.saveResource(id, {
              sport_id: p.sportId,
              name,
              kind: p.kind,
              active: true,
              light_price: p.lightPrice,
              light_from: p.lightFrom,
            })
            await scheduleService.savePrice(id, {
              owner: "resource",
              id: r.id,
              price_per_hour: p.pricePerHour,
              currency,
            })
            await scheduleService.saveHours(id, {
              owner: "resource",
              id: r.id,
              hours: WEEK.map((weekday) => ({
                weekday,
                open: p.open,
                close: p.close,
              })),
            })
          }
        }
      }, 4),
    /** makes the weekly group classes and finishes the setup */
    finish: (classes: TimetableInput[]) =>
      run(async () => {
        for (const c of classes) await classService.saveTimetable(id, c)
      }, 0),
  }
}
