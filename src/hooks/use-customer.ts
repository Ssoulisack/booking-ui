import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"

import { useBiz } from "@/hooks/use-branch"

import { companyKeys } from "@/hooks/use-company"
import { customerService } from "@/services/customer.api"

export function useCompanyCustomers(q: { keyword: string; page: number }) {
  return useQuery({
    queryKey: companyKeys.customers(q),
    queryFn: () => customerService.companyList(q),
    placeholderData: keepPreviousData,
  })
}

/** Whose account is it? By phone, customer number (CNO000042) or email — shown before booking for it */
export function useFindCustomer() {
  const { id: branchId } = useBiz()
  return useMutation({
    mutationFn: (q: string) => customerService.find(branchId, q),
  })
}

export function useCustomers(keyword: string, page: number, limit = 20) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("customers", keyword, page, limit),
    queryFn: () => customerService.branchList(branchId, keyword, page, limit),
    placeholderData: keepPreviousData,
  })
}
