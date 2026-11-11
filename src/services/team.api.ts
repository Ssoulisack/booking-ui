import { api, apiMessage, apiPage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { User } from "@/types/auth"
import type {
  AddTeamMemberInput,
  BranchTeamMember,
  Invitation,
  InviteInput,
  TeamCandidate,
  TeamMember,
  TeamMemberInput,
} from "@/types/team"

// The company's people: team members, invitations and the user accounts

export const teamService = {
  list: () => api<TeamMember[]>(API_ENDPOINTS.COMPANY.TEAM),
  update: (id: number, body: TeamMemberInput) =>
    api<TeamMember>(API_ENDPOINTS.COMPANY.TEAM_MEMBER(id), {
      method: "PUT",
      body,
    }),
  remove: (id: number) =>
    apiMessage(API_ENDPOINTS.COMPANY.TEAM_MEMBER(id), { method: "DELETE" }),
  transferOwnership: (userId: number) =>
    apiMessage(API_ENDPOINTS.COMPANY.TRANSFER_OWNERSHIP, {
      method: "POST",
      body: { user_id: userId },
    }),

  /** find a registered account by phone or member number */
  lookup: (q: string) =>
    api<TeamCandidate>(API_ENDPOINTS.COMPANY.TEAM_LOOKUP, { query: { q } }),
  /** put a registered account on the team, without an invitation */
  add: (body: AddTeamMemberInput) =>
    api<TeamMember>(API_ENDPOINTS.COMPANY.TEAM, { method: "POST", body }),

  /** who works at a branch; role and q (phone, member number or name) filter */
  branchTeam: (branchId: number, role: string, q: string) =>
    api<BranchTeamMember[]>(API_ENDPOINTS.BRANCH.TEAM(branchId), {
      query: { role: role || undefined, q: q || undefined },
    }),
  /** switch someone's access to the branch off or on */
  setBranchAccess: (
    branchId: number,
    input: { userId: number; active: boolean },
  ) =>
    apiMessage(API_ENDPOINTS.BRANCH.TEAM_MEMBER(branchId, input.userId), {
      method: "PATCH",
      body: { active: input.active },
    }),
  /** take someone off the branch */
  removeFromBranch: (branchId: number, userId: number) =>
    apiMessage(API_ENDPOINTS.BRANCH.TEAM_MEMBER(branchId, userId), {
      method: "DELETE",
    }),

  invitations: () => api<Invitation[]>(API_ENDPOINTS.COMPANY.INVITATIONS),
  invite: (body: InviteInput) =>
    api<Invitation>(API_ENDPOINTS.COMPANY.INVITATIONS, {
      method: "POST",
      body,
    }),
  cancelInvitation: (id: number) =>
    apiMessage(API_ENDPOINTS.COMPANY.INVITATION(id), { method: "DELETE" }),
  resendInvitation: (id: number) =>
    api<Invitation>(API_ENDPOINTS.COMPANY.INVITATION_RESEND(id), {
      method: "POST",
    }),

  users: (q: { keyword: string; page: number }) =>
    apiPage<User>(API_ENDPOINTS.COMPANY.USERS, {
      query: { keyword: q.keyword || undefined, page: q.page, limit: 20 },
    }),
  setUserStatus: (id: number, status: boolean) =>
    apiMessage(API_ENDPOINTS.COMPANY.USER_STATUS(id), {
      method: "PATCH",
      body: { status },
    }),
  setUserPassword: (id: number, password: string) =>
    apiMessage(API_ENDPOINTS.COMPANY.USER_PASSWORD(id), {
      method: "POST",
      body: { password },
    }),
}
