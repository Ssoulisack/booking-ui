import { useQuery } from "@tanstack/react-query"

import { api, apiMessage } from "@/lib/api/client"
import type {
  CustomerPackage,
  PackageInput,
  PackageItem,
  PackageVisit,
} from "@/lib/api/types"

import { useBiz } from "../api"

// ---------- reads ----------

/** The packages the branch sells (the team sees inactive ones too) */
export function usePackages() {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("packages"),
    queryFn: () => api<PackageItem[]>(`${base}/packages`),
  })
}

/** What customers bought here; filter by one customer and/or a status ("" = any) */
export function useSoldPackages(
  f: { customerId?: number; status?: string; q?: string },
  enabled = true,
) {
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key(
      "sold-packages",
      f.customerId ?? 0,
      f.status ?? "",
      f.q ?? "",
    ),
    queryFn: () =>
      api<CustomerPackage[]>(`${base}/customer-packages`, {
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
  const { base, key } = useBiz()
  return useQuery({
    queryKey: key("sold-packages", "visits", id),
    queryFn: () =>
      api<PackageVisit[]>(`${base}/customer-packages/${id}/visits`),
    enabled: id !== null,
  })
}

// ---------- changes (used with useChange) ----------

export const packageApi = {
  save: (base: string, p: { id?: number } & PackageInput) =>
    p.id
      ? api<PackageItem>(`${base}/packages/${p.id}`, { method: "PUT", body: p })
      : api<PackageItem>(`${base}/packages`, { method: "POST", body: p }),
  remove: (base: string, id: number) =>
    apiMessage(`${base}/packages/${id}`, { method: "DELETE" }),
  sell: (
    base: string,
    s: {
      customer_id: number
      package_id: number
      option_id: number
      payment_method: string
      notes: string
    },
  ) =>
    api<CustomerPackage>(`${base}/customer-packages`, {
      method: "POST",
      body: s,
    }),
  markPaid: (base: string, p: { id: number; method: string }) =>
    api<CustomerPackage>(`${base}/customer-packages/${p.id}/paid`, {
      method: "POST",
      body: { method: p.method },
    }),
  cancel: (base: string, id: number) =>
    api<CustomerPackage>(`${base}/customer-packages/${id}/cancel`, {
      method: "POST",
    }),
  adjust: (
    base: string,
    a: { id: number; visits: number; extend_days: number; note: string },
  ) =>
    api<CustomerPackage>(`${base}/customer-packages/${a.id}/adjust`, {
      method: "POST",
      body: { visits: a.visits, extend_days: a.extend_days, note: a.note },
    }),
}
