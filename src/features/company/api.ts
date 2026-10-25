import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { api, apiMessage, apiPage } from "@/lib/api/client"
import type {
  BranchSummary,
  Company,
  CompanyInput,
  CompanyReport,
  Customer,
  Invitation,
  InviteInput,
  Media,
  Rule,
  RuleFields,
  TeamMember,
  TeamMemberInput,
  User,
} from "@/lib/api/types"

// What the company owner and admins run (/company on the API)

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

// ---------- reads ----------

export function useCompany() {
  return useQuery({
    queryKey: companyKeys.company,
    queryFn: () => api<Company>("/company/"),
    // the page remounts its form when this data changes: a refocus (e.g. after the file picker) must not wipe unsaved edits
    refetchOnWindowFocus: false,
  })
}

export function useCompanyRule() {
  return useQuery({
    queryKey: companyKeys.rule,
    queryFn: () => api<Rule>("/company/rules"),
    // the page remounts its form when this data changes: a refocus (e.g. after the file picker) must not wipe unsaved edits
    refetchOnWindowFocus: false,
  })
}

export function useBranches() {
  return useQuery({
    queryKey: companyKeys.branches,
    queryFn: () => api<BranchSummary[]>("/company/branches"),
  })
}

export function useTeam() {
  return useQuery({
    queryKey: companyKeys.team,
    queryFn: () => api<TeamMember[]>("/company/team"),
  })
}

export function useInvitations() {
  return useQuery({
    queryKey: companyKeys.invitations,
    queryFn: () => api<Invitation[]>("/company/invitations"),
  })
}

export function useUsers(q: { keyword: string; page: number }) {
  return useQuery({
    queryKey: companyKeys.users(q),
    queryFn: () =>
      apiPage<User>("/company/users", {
        query: { keyword: q.keyword || undefined, page: q.page, limit: 20 },
      }),
    placeholderData: keepPreviousData,
  })
}

export function useCompanyCustomers(q: { keyword: string; page: number }) {
  return useQuery({
    queryKey: companyKeys.customers(q),
    queryFn: () =>
      apiPage<Customer>("/company/customers", {
        query: { keyword: q.keyword || undefined, page: q.page, limit: 20 },
      }),
    placeholderData: keepPreviousData,
  })
}

export function useCompanyReport(q: { from: string; to: string }) {
  return useQuery({
    queryKey: companyKeys.report(q),
    queryFn: () => api<CompanyReport>("/company/report", { query: q }),
    placeholderData: keepPreviousData,
  })
}

// ---------- changes: each refreshes the company data and the branch switcher ----------

function useCompanyMutation<In, Out>(fn: (input: In) => Promise<Out>) {
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

export const useUpdateCompany = () =>
  useCompanyMutation((body: CompanyInput) =>
    api<Company>("/company/", { method: "PUT", body }),
  )

export const useSetCompanyRule = () =>
  useCompanyMutation((fields: RuleFields) =>
    api<Rule>("/company/rules", { method: "PUT", body: fields }),
  )

export const uploadCompanyImage = (folder: string, file: File) => {
  const form = new FormData()
  form.append("file", file)
  return api<Media>("/company/uploads", {
    method: "POST",
    form,
    query: { folder },
  })
}

export const useCreateBranch = () =>
  useCompanyMutation(
    (body: { name: string; slug: string; clone_from?: number }) =>
      api<BranchSummary>("/company/branches", { method: "POST", body }),
  )

export const useSetClosed = () =>
  useCompanyMutation(({ id, closed }: { id: number; closed: boolean }) =>
    api<BranchSummary>(
      `/company/branches/${id}/${closed ? "close" : "reopen"}`,
      { method: "POST" },
    ),
  )

export const useUpdateTeamMember = () =>
  useCompanyMutation(({ id, ...body }: TeamMemberInput & { id: number }) =>
    api<TeamMember>(`/company/team/${id}`, { method: "PUT", body }),
  )

export const useRemoveTeamMember = () =>
  useCompanyMutation((id: number) =>
    apiMessage(`/company/team/${id}`, { method: "DELETE" }),
  )

export const useTransferOwnership = () =>
  useCompanyMutation((userId: number) =>
    apiMessage("/company/transfer-ownership", {
      method: "POST",
      body: { user_id: userId },
    }),
  )

export const useInvite = () =>
  useCompanyMutation((body: InviteInput) =>
    api<Invitation>("/company/invitations", { method: "POST", body }),
  )

export const useCancelInvitation = () =>
  useCompanyMutation((id: number) =>
    apiMessage(`/company/invitations/${id}`, { method: "DELETE" }),
  )

export const useResendInvitation = () =>
  useCompanyMutation((id: number) =>
    api<Invitation>(`/company/invitations/${id}/resend`, { method: "POST" }),
  )

export const useUserStatus = () =>
  useCompanyMutation(({ id, status }: { id: number; status: boolean }) =>
    apiMessage(`/company/users/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),
  )

export const useSetPassword = () =>
  useCompanyMutation(({ id, password }: { id: number; password: string }) =>
    apiMessage(`/company/users/${id}/password`, {
      method: "POST",
      body: { password },
    }),
  )

// ---------- helpers ----------

/**
 * The link part of a name, like the backend makes it: "Smash Tennis!" → "smash-tennis".
 * Lao or Thai names give "" — the backend then makes a link itself.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "")
}

const WORDS = [
  "kiwi",
  "moon",
  "river",
  "tiger",
  "mango",
  "cloud",
  "lotus",
  "stone",
  "eagle",
  "rain",
  "sun",
  "tree",
  "lake",
  "star",
  "rice",
  "wind",
]

/** A readable password to tell someone by phone, e.g. "kiwi-4821-moon" */
export function readablePassword(random: (n: number) => number = cryptoInt) {
  const word = () => WORDS[random(WORDS.length)]
  const digits = String(random(9000) + 1000)
  return `${word()}-${digits}-${word()}`
}

function cryptoInt(n: number): number {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0] % n
}
