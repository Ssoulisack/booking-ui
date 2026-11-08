import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { companyKeys } from "@/hooks/use-company"
import { customerService } from "@/services/customer.api"

export function useCompanyCustomers(q: { keyword: string; page: number }) {
  return useQuery({
    queryKey: companyKeys.customers(q),
    queryFn: () => customerService.companyList(q),
    placeholderData: keepPreviousData,
  })
}
