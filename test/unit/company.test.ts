import { describe, expect, it } from "vitest"

import { readablePassword, slugify } from "@/features/company/api"
import { copyName } from "@/features/company/clone"
import { paginate } from "@/features/company/paging"
import { matchesMember, parseEmployeeNo } from "@/features/company/team-filter"
import type { TeamMember } from "@/lib/api/types"

describe("booking page link from a name", () => {
  it("keeps lower-case letters, numbers and single dashes", () => {
    expect(slugify("Smash Tennis!")).toBe("smash-tennis")
    expect(slugify("  Café  Sport  2 ")).toBe("cafe-sport-2")
  })

  it("gives nothing for a Lao name, so the backend makes the link", () => {
    expect(slugify("ສະໂມສອນກິລາ")).toBe("")
  })

  it("never ends with a dash after cutting to 60 characters", () => {
    const slug = slugify(`${"a".repeat(59)} b`)
    expect(slug.length).toBeLessThanOrEqual(60)
    expect(slug.endsWith("-")).toBe(false)
  })
})

describe("suggested password", () => {
  it("is word-4 digits-word and long enough", () => {
    const fixed = readablePassword(() => 0)
    expect(fixed).toBe("kiwi-1000-kiwi")
    for (let i = 0; i < 20; i++) {
      const p = readablePassword()
      expect(p).toMatch(/^[a-z]+-\d{4}-[a-z]+$/)
      expect(p.length).toBeGreaterThanOrEqual(8)
    }
  })
})

describe("team search", () => {
  const staff: TeamMember = {
    user_id: 42,
    member_no: "ENO000042",
    name: "Noy Phommachanh",
    email: "noy@riverside.la",
    phone: "2055551234",
    role: "staff",
    branches: [{ id: 7, name: "Riverside" }],
    active: true,
  }
  const admin: TeamMember = {
    ...staff,
    user_id: 3,
    member_no: "ENO000003",
    name: "Ana Admin",
    email: "ana@riverside.la",
    phone: "",
    role: "admin",
    branches: [],
  }
  const match = (m: TeamMember, q: string, branch = 0) =>
    matchesMember(m, { q, branch })

  it("finds by part of the name or email, in any case", () => {
    expect(match(staff, "phomma")).toBe(true)
    expect(match(staff, "NOY@RIVER")).toBe(true)
    expect(match(staff, "somchai")).toBe(false)
  })

  it("reads an employee number the way people type it", () => {
    expect(parseEmployeeNo("ENO000042")).toBe("ENO000042")
    expect(parseEmployeeNo("eno42")).toBe("ENO000042")
    expect(parseEmployeeNo("ENO-42")).toBe("ENO000042")
    expect(parseEmployeeNo("ENO1234567")).toBe("ENO1234567")
    expect(parseEmployeeNo("CNO000042")).toBeNull()
    expect(parseEmployeeNo("42")).toBeNull()
  })

  it("finds by the whole employee number only", () => {
    expect(match(staff, "ENO000042")).toBe(true)
    expect(match(staff, "eno 42")).toBe(true)
    expect(match(staff, "ENO4")).toBe(false)
    expect(match(admin, "ENO000042")).toBe(false)
    // the account id is not a search key: admin is account 3 and has no phone
    expect(match(admin, "3")).toBe(false)
  })

  it("finds by phone typed with the leading 0 and spaces", () => {
    expect(match(staff, "020 5555 1234")).toBe(true)
    expect(match(staff, "5555")).toBe(true)
    expect(match(admin, "5555")).toBe(false)
  })

  it("filters by access on or off", () => {
    const off = { ...staff, active: false }
    expect(matchesMember(off, { q: "", branch: 0, access: "off" })).toBe(true)
    expect(matchesMember(off, { q: "", branch: 0, access: "on" })).toBe(false)
    expect(matchesMember(staff, { q: "", branch: 0, access: "on" })).toBe(true)
  })

  it("filters by role", () => {
    expect(matchesMember(staff, { q: "", branch: 0, role: "staff" })).toBe(true)
    expect(matchesMember(staff, { q: "", branch: 0, role: "manager" })).toBe(
      false,
    )
    expect(matchesMember(admin, { q: "", branch: 7, role: "admin" })).toBe(true)
  })

  it("filters by branch; the owner and admins work at every branch", () => {
    expect(match(staff, "", 7)).toBe(true)
    expect(match(staff, "", 8)).toBe(false)
    expect(match(admin, "", 8)).toBe(true)
  })
})

describe("pages of a whole list", () => {
  const items = Array.from({ length: 45 }, (_, i) => i + 1)

  it("cuts 20 per page and counts the pages", () => {
    const first = paginate(items, 1)
    expect(first.items).toEqual(items.slice(0, 20))
    expect(first.meta).toEqual({ total: 45, page: 1, limit: 20, total_page: 3 })
    expect(paginate(items, 3).items).toEqual([41, 42, 43, 44, 45])
  })

  it("shows the last page when the page is past the end (after a filter)", () => {
    const p = paginate(items.slice(0, 5), 3)
    expect(p.page).toBe(1)
    expect(p.items).toHaveLength(5)
  })

  it("has one empty page for an empty list", () => {
    expect(paginate([], 1).meta.total_page).toBe(1)
  })
})

describe("name of a cloned branch", () => {
  const branch = (name: string) => ({ name, slug: slugify(name) })

  it("adds -COPY to the branch", () => {
    expect(copyName("NONGBONE", [branch("NONGBONE")])).toBe("NONGBONE-COPY")
  })

  it("counts -COPY-1, -2, -3 from the original, also when the source is a copy", () => {
    const all = [branch("NONGBONE"), branch("NONGBONE-COPY")]
    expect(copyName("NONGBONE-COPY", all)).toBe("NONGBONE-COPY-1")
    expect(copyName("NONGBONE", all)).toBe("NONGBONE-COPY-1")
    all.push(branch("NONGBONE-COPY-1"))
    expect(copyName("NONGBONE-COPY-1", all)).toBe("NONGBONE-COPY-2")
    all.push(branch("NONGBONE-COPY-2"))
    expect(copyName("NONGBONE", all)).toBe("NONGBONE-COPY-3")
  })

  it("skips a name whose link is taken", () => {
    const taken = [{ name: "Other", slug: "nongbone-copy" }]
    expect(copyName("NONGBONE", taken)).toBe("NONGBONE-COPY-1")
  })
})
