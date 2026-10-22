import { describe, expect, it } from "vitest"

import { homePath, safeNext } from "@/features/auth/landing"
import type { MyBranch, User } from "@/lib/api/types"
import { roleAtLeast } from "@/lib/roles"

const user = (company_role: User["company_role"] = ""): User => ({
  id: 1,
  email: "a@b.la",
  avatar: "",
  name: "A",
  username: "",
  phone: "",
  company_role,
  status: true,
  nationality: "LA",
  email_generated: false,
  member_no: "CNO000001",
  created_at: "",
  updated_at: "",
})

const member = (over: Partial<MyBranch> = {}): MyBranch => ({
  branch_id: 1,
  name: "Smash Tennis",
  slug: "smash-tennis",
  status: "published",
  role: "staff",
  active: true,
  ...over,
})

describe("after login", () => {
  it("sends the owner and admins to the company area", () => {
    expect(homePath(user("owner"), [member({ role: "owner" })])).toBe(
      "/company",
    )
    expect(homePath(user("admin"), [])).toBe("/company")
  })

  it("sends people who work at an open branch to the dashboard", () => {
    expect(homePath(user(), [member()])).toBe("/dashboard")
    expect(
      homePath(user(), [member({ status: "draft", role: "manager" })]),
    ).toBe("/dashboard")
  })

  it("sends customers, and members who were switched off, to find a place", () => {
    expect(homePath(user(), [])).toBe("/")
    expect(homePath(user(), [member({ active: false })])).toBe("/")
    expect(homePath(user(), [member({ status: "closed" })])).toBe("/")
  })

  it("follows only same-site paths", () => {
    expect(safeNext("/b/smash-tennis")).toBe("/b/smash-tennis")
    expect(safeNext("/invite/abc")).toBe("/invite/abc")
    for (const bad of [
      null,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/login",
    ]) {
      expect(safeNext(bad)).toBeNull()
    }
  })
})

describe("roles", () => {
  it("ranks owner above manager above staff", () => {
    expect(roleAtLeast("owner", "manager")).toBe(true)
    expect(roleAtLeast("manager", "manager")).toBe(true)
    expect(roleAtLeast("staff", "manager")).toBe(false)
    expect(roleAtLeast("manager", "owner")).toBe(false)
    // the owner and admins act the same at every branch
    expect(roleAtLeast("admin", "owner")).toBe(true)
    expect(roleAtLeast("manager", "admin")).toBe(false)
  })
})
