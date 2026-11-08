import { api } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { BranchType } from "@/types/auth"
import type {
  BranchSummary,
  Company,
  CompanyInput,
  CompanyReport,
} from "@/types/company"
import type { Rule, RuleFields } from "@/types/schedule"

// What the company owner and admins run (/company on the API)

export interface NewBranch {
  name: string
  slug: string
  type?: BranchType
  clone_from?: number
}

export const companyService = {
  get: () => api<Company>(API_ENDPOINTS.COMPANY.ROOT),
  update: (body: CompanyInput) =>
    api<Company>(API_ENDPOINTS.COMPANY.ROOT, { method: "PUT", body }),
  getRule: () => api<Rule>(API_ENDPOINTS.COMPANY.RULES),
  setRule: (fields: RuleFields) =>
    api<Rule>(API_ENDPOINTS.COMPANY.RULES, { method: "PUT", body: fields }),
  report: (query: { from: string; to: string }) =>
    api<CompanyReport>(API_ENDPOINTS.COMPANY.REPORT, { query }),
  branches: () => api<BranchSummary[]>(API_ENDPOINTS.COMPANY.BRANCHES),
  createBranch: (body: NewBranch) =>
    api<BranchSummary>(API_ENDPOINTS.COMPANY.BRANCHES, {
      method: "POST",
      body,
    }),
  setBranchClosed: (id: number, closed: boolean) =>
    api<BranchSummary>(
      closed
        ? API_ENDPOINTS.COMPANY.BRANCH_CLOSE(id)
        : API_ENDPOINTS.COMPANY.BRANCH_REOPEN(id),
      { method: "POST" },
    ),
}
