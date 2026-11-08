import { useQuery } from "@tanstack/react-query"

import { useBiz, useChange, useDelete } from "@/hooks/use-branch"
import { scheduleService } from "@/services/schedule.api"
import type { HoursOwner, ScheduleOwner } from "@/types/schedule"

/** Query options shared by the single hooks and by lists that check every court at once */
export function hoursQuery(
  biz: ReturnType<typeof useBiz>,
  owner: HoursOwner,
  id: number,
) {
  return {
    queryKey: biz.key("hours", owner, id),
    queryFn: () => scheduleService.hours(biz.id, owner, id),
  }
}

/** The owner's price, or null when none is set yet */
export function priceQuery(
  biz: ReturnType<typeof useBiz>,
  owner: ScheduleOwner,
  id: number,
) {
  return {
    queryKey: biz.key("price", owner, id),
    queryFn: () => scheduleService.price(biz.id, owner, id),
  }
}

export function useOpeningHours(owner: HoursOwner, id: number) {
  return useQuery(hoursQuery(useBiz(), owner, id))
}

export function usePrice(owner: ScheduleOwner, id: number) {
  return useQuery(priceQuery(useBiz(), owner, id))
}

/** What a court or coach still needs before people can book it: opening hours and a price */
export function useReadiness(owner: ScheduleOwner, id: number) {
  const hours = useOpeningHours(owner, id)
  const price = usePrice(owner, id)
  return {
    loading: hours.isPending || price.isPending,
    hasHours: (hours.data?.length ?? 0) > 0,
    price: price.data ?? null,
  }
}

export function useClosures() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("closures"),
    queryFn: () => scheduleService.closures(branchId),
  })
}

export function useRules() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("rules"),
    queryFn: () => scheduleService.rules(branchId),
  })
}

/** The company rule this branch starts from (read only here; the owner and admins change it) */
export function useCompanyRuleAtBranch() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("rules", "company"),
    queryFn: () => scheduleService.companyRule(branchId),
  })
}

/** The rule in force for a sport or a court (default ← sport ← court) */
export function useEffectiveRule(q: {
  sport_id?: number
  resource_id?: number
}) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("rules", "effective", q),
    queryFn: () => scheduleService.effectiveRule(branchId, q),
    retry: false,
  })
}

export const useSaveHours = (refresh = ["hours"]) =>
  useChange(scheduleService.saveHours, refresh)

export const useSavePrice = (refresh = ["price"]) =>
  useChange(scheduleService.savePrice, refresh)

export const useSaveClosure = (refresh = ["closures"]) =>
  useChange(scheduleService.saveClosure, refresh)

export const useDeleteClosure = (onDone: () => void) =>
  useDelete(scheduleService.deleteClosure, onDone)

/** Rule changes a screen strings together itself (it refreshes on its own) */
export function useRuleActions() {
  const { id: branchId } = useBiz()
  return {
    saveRule: (r: Parameters<typeof scheduleService.saveRule>[1]) =>
      scheduleService.saveRule(branchId, r),
    deleteRule: (r: Parameters<typeof scheduleService.deleteRule>[1]) =>
      scheduleService.deleteRule(branchId, r),
  }
}
