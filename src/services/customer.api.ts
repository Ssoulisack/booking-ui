import { api, apiPage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { Customer, CustomerMatch } from "@/types/customer"

export const customerService = {
  /** Every customer of the company, all branches */
  companyList: (q: { keyword: string; page: number }) =>
    apiPage<Customer>(API_ENDPOINTS.COMPANY.CUSTOMERS, {
      query: { keyword: q.keyword || undefined, page: q.page, limit: 20 },
    }),

  /** Whose account is it? By phone, customer number (CNO000042) or email */
  find: (branchId: number, q: string) =>
    api<CustomerMatch>(API_ENDPOINTS.BRANCH.CUSTOMERS_FIND(branchId), {
      query: { q },
    }),
  branchList: (
    branchId: number,
    keyword: string,
    page: number,
    limit: number,
  ) =>
    apiPage<Customer>(API_ENDPOINTS.BRANCH.CUSTOMERS(branchId), {
      query: { keyword, page, limit },
    }),
}
