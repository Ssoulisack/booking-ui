import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useBiz, useChange } from "@/hooks/use-branch"
import { companyKeys, useCompanyMutation } from "@/hooks/use-company"
import { teamService } from "@/services/team.api"
import type {
  AddTeamMemberInput,
  InviteInput,
  TeamMemberInput,
} from "@/types/team"

export function useTeam() {
  return useQuery({
    queryKey: companyKeys.team,
    queryFn: teamService.list,
  })
}

export function useInvitations() {
  return useQuery({
    queryKey: companyKeys.invitations,
    queryFn: teamService.invitations,
  })
}

export function useUsers(q: { keyword: string; page: number }) {
  return useQuery({
    queryKey: companyKeys.users(q),
    queryFn: () => teamService.users(q),
    placeholderData: keepPreviousData,
  })
}

/** The account with this phone or member number (asked when Find is pressed; "" asks nothing) */
export function useTeamCandidate(q: string) {
  return useQuery({
    queryKey: ["company", "team", "lookup", q],
    queryFn: () => teamService.lookup(q),
    enabled: q !== "",
    retry: false,
  })
}

export const useAddTeamMember = () =>
  useCompanyMutation((body: AddTeamMemberInput) => teamService.add(body))

/** Who works at this branch (the dashboard's Employees page) */
export function useBranchTeam(role: string, q: string) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("team", role, q),
    queryFn: () => teamService.branchTeam(branchId, role, q),
    placeholderData: keepPreviousData,
  })
}

export const useSetBranchAccess = () =>
  useChange(teamService.setBranchAccess, ["team"])

export const useRemoveFromBranch = () =>
  useChange(teamService.removeFromBranch, ["team"])

export const useUpdateTeamMember = () =>
  useCompanyMutation(({ id, ...body }: TeamMemberInput & { id: number }) =>
    teamService.update(id, body),
  )

export const useRemoveTeamMember = () =>
  useCompanyMutation((id: number) => teamService.remove(id))

export const useTransferOwnership = () =>
  useCompanyMutation((userId: number) => teamService.transferOwnership(userId))

export const useInvite = () =>
  useCompanyMutation((body: InviteInput) => teamService.invite(body))

export const useCancelInvitation = () =>
  useCompanyMutation((id: number) => teamService.cancelInvitation(id))

export const useResendInvitation = () =>
  useCompanyMutation((id: number) => teamService.resendInvitation(id))

export const useUserStatus = () =>
  useCompanyMutation(({ id, status }: { id: number; status: boolean }) =>
    teamService.setUserStatus(id, status),
  )

export const useSetPassword = () =>
  useCompanyMutation(({ id, password }: { id: number; password: string }) =>
    teamService.setUserPassword(id, password),
  )
