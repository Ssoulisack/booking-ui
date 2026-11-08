import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { companyService, type NewBranch } from "@/services/company.api"
import type { CompanyInput } from "@/types/company"
import type { RuleFields } from "@/types/schedule"

export const companyKeys = {
  all: ["company"] as const,
  company: ["company", "settings"] as const,
  rule: ["company", "rule"] as const,
  branches: ["company", "branches"] as const,
  team: ["company", "team"] as const,
  invitations: ["company", "invitations"] as const,
  users: (q: object) => ["company", "users", q] as const,
  customers: (q: object) => ["company", "customers", q] as const,
  report: (q: object) => ["company", "report", q] as const,
}

/** A change to the company: refreshes the company data, the branch switcher and the public pages */
export function useCompanyMutation<In, Out>(fn: (input: In) => Promise<Out>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: companyKeys.all })
      void qc.invalidateQueries({ queryKey: ["me", "branches"] })
      void qc.invalidateQueries({ queryKey: ["public"] })
    },
  })
}

export function useCompany() {
  return useQuery({
    queryKey: companyKeys.company,
    queryFn: companyService.get,
    // the page remounts its form when this data changes: a refocus (e.g. after the file picker) must not wipe unsaved edits
    refetchOnWindowFocus: false,
  })
}

export function useCompanyRule() {
  return useQuery({
    queryKey: companyKeys.rule,
    queryFn: companyService.getRule,
    // the page remounts its form when this data changes: a refocus (e.g. after the file picker) must not wipe unsaved edits
    refetchOnWindowFocus: false,
  })
}

export function useCompanyReport(q: { from: string; to: string }) {
  return useQuery({
    queryKey: companyKeys.report(q),
    queryFn: () => companyService.report(q),
    placeholderData: keepPreviousData,
  })
}

export function useBranches() {
  return useQuery({
    queryKey: companyKeys.branches,
    queryFn: companyService.branches,
  })
}

export const useUpdateCompany = () =>
  useCompanyMutation((body: CompanyInput) => companyService.update(body))

export const useSetCompanyRule = () =>
  useCompanyMutation((fields: RuleFields) => companyService.setRule(fields))

export const useCreateBranch = () =>
  useCompanyMutation((body: NewBranch) => companyService.createBranch(body))

export const useSetClosed = () =>
  useCompanyMutation(({ id, closed }: { id: number; closed: boolean }) =>
    companyService.setBranchClosed(id, closed),
  )
