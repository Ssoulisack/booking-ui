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

/** The Membership tab: customers who bought a package here */
export function useMembers(keyword: string, page: number, limit = 20) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    // under sold-packages: selling, paying or cancelling a package refreshes it
    queryKey: key("sold-packages", "members", keyword, page, limit),
    queryFn: () => customerService.members(branchId, keyword, page, limit),
    placeholderData: keepPreviousData,
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
