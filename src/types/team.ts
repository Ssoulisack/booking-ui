import type { CompanyRole, MemberRole } from "@/types/auth"
import type { BranchRef } from "@/types/company"

export interface TeamMember {
  user_id: number
  member_no: string // "ENO000007"
  name: string
  email: string
  phone: string
  role: CompanyRole | MemberRole
  branches: BranchRef[]
  active: boolean
}

/** One person who works at a branch: the owner and admins (every branch) and its managers and staff */
export interface BranchTeamMember {
  user_id: number
  member_no: string
  name: string
  phone: string
  email: string
  role: "owner" | "admin" | MemberRole
  /** false: their access to this branch is switched off */
  active: boolean
}

/** A registered account found by phone or member number, to add to the team (people without email) */
export interface TeamCandidate {
  user_id: number
  member_no: string
  name: string
  phone: string
  email: string // empty when there is no real email
  in_team: boolean
}

export interface AddTeamMemberInput {
  user_id: number
  role: "admin" | MemberRole
  branch_ids: number[]
}

export interface TeamMemberInput {
  role: "admin" | MemberRole
  branch_ids: number[]
  active: boolean
}

export interface Invitation {
  id: number
  email: string
  role: "admin" | MemberRole
  branches: BranchRef[]
  expires_at: string
}

export interface InviteInput {
  email: string
  role: "admin" | MemberRole
  branch_ids: number[]
}
