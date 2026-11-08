import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { companyKeys, useCompanyMutation } from "@/hooks/use-company"
import { teamService } from "@/services/team.api"
import type { InviteInput, TeamMemberInput } from "@/types/team"

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
