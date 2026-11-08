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
