export interface User {
  id: number
  email: string
  avatar: string
  name: string
  username: string
  phone: string
  company_role: CompanyRole // "owner" / "admin" run every branch; "" for everyone else
  nationality: string // ISO code ("LA"); empty until chosen
  email_generated: boolean // the email is a stand-in: no real address yet
  // the number this person tells staff; one is set, by role
  member_no: string // what this person tells staff: CNO000042 (customer) or ENO000007 (the team)
  status: boolean
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

export type CompanyRole = "" | "owner" | "admin"

/** Roles at one branch (manager, staff) */
export type MemberRole = "manager" | "staff"

/** What someone is at a branch: the owner and admins act at every branch */
export type BranchRole = "owner" | "admin" | MemberRole

export type BranchStatus = "draft" | "published" | "closed"

/** What a branch takes bookings for: courts (sport) or tables (restaurant, bar, café) */
export type BranchType = "sport" | "restaurant"

export interface MyBranch {
  branch_id: number
  type: BranchType
  name: string
  slug: string
  status: BranchStatus
  role: BranchRole
  active: boolean
}

export interface InvitationInfo {
  company_name: string
  email: string
  role: "admin" | MemberRole
  branches: string[] // empty for an admin (every branch)
  account_exists: boolean
}

export interface LoginInput {
  login: string // email or phone number
  password: string
}

export interface RegisterInput {
  name: string
  password: string
  phone: string
  email?: string
}

export interface ProfileInput {
  name: string
  phone: string
  email: string
}

export interface AcceptInput {
  name?: string
  password?: string
  phone?: string
}
