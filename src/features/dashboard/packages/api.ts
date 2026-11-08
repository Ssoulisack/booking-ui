import { useQuery } from "@tanstack/react-query"

import { api, apiMessage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  CustomerPackage,
  PackageInput,
  PackageItem,
  PackageVisit,
} from "@/types/package"

import { useBiz } from "@/hooks/use-branch"

// ---------- reads ----------

/** The packages the branch sells (the team sees inactive ones too) */
export function usePackages() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("packages"),
    queryFn: () => api<PackageItem[]>(API_ENDPOINTS.BRANCH.PACKAGES(branchId)),
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
    queryFn: () =>
      api<CustomerPackage[]>(API_ENDPOINTS.BRANCH.CUSTOMER_PACKAGES(branchId), {
        query: {
          ...(f.customerId ? { customer_id: f.customerId } : {}),
          ...(f.status ? { status: f.status } : {}),
          ...(f.q ? { q: f.q } : {}),
        },
      }),
    refetchInterval: 30_000,
    enabled,
  })
}

/** A package's log: every use, give-back and adjustment */
export function usePackageVisits(id: number | null) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("sold-packages", "visits", id),
    queryFn: () =>
      api<PackageVisit[]>(
        API_ENDPOINTS.BRANCH.CUSTOMER_PACKAGE_VISITS(branchId, id as number),
      ),
    enabled: id !== null,
  })
}

// ---------- changes (used with useChange) ----------

export const packageApi = {
  save: (branchId: number, p: { id?: number } & PackageInput) =>
    p.id
      ? api<PackageItem>(API_ENDPOINTS.BRANCH.PACKAGE(branchId, p.id), {
          method: "PUT",
          body: p,
        })
      : api<PackageItem>(API_ENDPOINTS.BRANCH.PACKAGES(branchId), {
          method: "POST",
          body: p,
        }),
  remove: (branchId: number, id: number) =>
    apiMessage(API_ENDPOINTS.BRANCH.PACKAGE(branchId, id), {
      method: "DELETE",
    }),
  sell: (
    branchId: number,
    s: {
      customer_id: number
      package_id: number
      option_id: number
      payment_method: string
      notes: string
    },
  ) =>
    api<CustomerPackage>(API_ENDPOINTS.BRANCH.CUSTOMER_PACKAGES(branchId), {
      method: "POST",
      body: s,
    }),
  markPaid: (branchId: number, p: { id: number; method: string }) =>
    api<CustomerPackage>(
      API_ENDPOINTS.BRANCH.CUSTOMER_PACKAGE_PAID(branchId, p.id),
      {
        method: "POST",
        body: { method: p.method },
      },
    ),
  cancel: (branchId: number, id: number) =>
    api<CustomerPackage>(
      API_ENDPOINTS.BRANCH.CUSTOMER_PACKAGE_CANCEL(branchId, id),
      {
        method: "POST",
      },
    ),
  adjust: (
    branchId: number,
    a: { id: number; visits: number; extend_days: number; note: string },
  ) =>
    api<CustomerPackage>(
      API_ENDPOINTS.BRANCH.CUSTOMER_PACKAGE_ADJUST(branchId, a.id),
      {
        method: "POST",
        body: { visits: a.visits, extend_days: a.extend_days, note: a.note },
      },
    ),
}
