import { apiPage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { Customer } from "@/types/customer"

export const customerService = {
  /** Every customer of the company, all branches */
  companyList: (q: { keyword: string; page: number }) =>
    apiPage<Customer>(API_ENDPOINTS.COMPANY.CUSTOMERS, {
      query: { keyword: q.keyword || undefined, page: q.page, limit: 20 },
    }),
}
