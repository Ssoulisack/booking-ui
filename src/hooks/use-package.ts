import { useQuery } from "@tanstack/react-query"

import { useBiz, useChange, useDelete } from "@/hooks/use-branch"
import { packageService } from "@/services/package.api"

/** The packages the branch sells (the team sees inactive ones too) */
export function usePackages() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("packages"),
    queryFn: () => packageService.list(branchId),
  })
}

/** What customers bought here; filter by one customer and/or a status ("" = any) */
export function useSoldPackages(
  f: { customerId?: number; status?: string; q?: string },
  enabled = true,
) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key(
      "sold-packages",
      f.customerId ?? 0,
      f.status ?? "",
      f.q ?? "",
    ),
    queryFn: () => packageService.sold(branchId, f),
    refetchInterval: 30_000,
    enabled,
  })
}

/** A package's log: every use, give-back and adjustment */
export function usePackageVisits(id: number | null) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("sold-packages", "visits", id),
    queryFn: () => packageService.visits(branchId, id as number),
    enabled: id !== null,
  })
}

export const useSavePackage = (refresh = ["packages"]) =>
  useChange(packageService.save, refresh)

export const useDeletePackage = (onDone: () => void) =>
  useDelete(packageService.remove, onDone)

export const useSellPackage = (refresh = ["sold-packages"]) =>
  useChange(packageService.sell, refresh)

export const useMarkPackagePaid = (refresh = ["sold-packages"]) =>
  useChange(packageService.markPaid, refresh)

export const useCancelPackage = (refresh = ["sold-packages"]) =>
  useChange(packageService.cancel, refresh)

export const useAdjustPackage = (refresh = ["sold-packages"]) =>
  useChange(packageService.adjust, refresh)
